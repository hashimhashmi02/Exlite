import express from 'express';
import { prisma } from './db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { env, isProd } from './env.js';
import { sendSignInEmail } from './email.js';
import { createMagicToken, verifyMagicToken, createSessionToken, verifySessionToken } from './auth.js';
import { requireAuth, getUserEmail } from './middleware.js';
import { initPricesFromDB, openTrade, closeTrade, getUsdBalance } from './engine.js';
import { getHumanPrice, setHumanPrice } from './engine.js';
import { initCandles, getKlines } from './candles.js';
import { startPriceSubscriber } from './engine.js';
import { loadAndEnsure, persistNow } from './snapshot.js';
import { listOpenOrdersByEmail } from './engine.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

const EmailBody = z.object({ email: z.string().email() });

app.post('/api/v1/signup', async (req, res) => {
  const parsed = EmailBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });

  const { email } = parsed.data;
  const token = createMagicToken(email);
  const magicUrl = `${env.BACKEND_URL}/api/v1/signin/post?token=${encodeURIComponent(token)}`;

  try {
    await sendSignInEmail(email, magicUrl);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Email error:', e?.message || e);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/v1/signin', async (req, res) => {
  const parsed = EmailBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });

  const { email } = parsed.data;
  const token = createMagicToken(email);
  const magicUrl = `${env.BACKEND_URL}/api/v1/signin/post?token=${encodeURIComponent(token)}`;

  try {
    await sendSignInEmail(email, magicUrl);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Email error:', e?.message || e);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

app.get('/api/v1/signin/post', async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') return res.status(400).send('Missing token');

  try {
    const { email } = verifyMagicToken(token);

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email }
    });

    const session = createSessionToken(email);
    res.cookie('session', session, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const target = new URL(env.FRONTEND_URL);
    target.searchParams.set('signedIn', '1');
    res.redirect(target.toString());
  } catch (e: any) {
    return res.status(400).send('Invalid or expired token');
  }
});
app.get('/api/v1/me', (req, res) => {
  const token = req.cookies?.session as string | undefined;
  if (!token) return res.status(401).json({ authenticated: false });

  try {
    const payload = verifySessionToken(token);
    return res.json({ authenticated: true, email: payload.email });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
});

app.get('/api/v1/openOrders', requireAuth, async (req, res) => {
  const email = (req as any).email || (req as any).user?.email || (req as any).userEmail;
  if (!email) return res.status(401).json({ error: 'No session' });
  const orders = listOpenOrdersByEmail(email);
  res.json({ orders });
});



app.get('/api/v1/admin/snapshot', requireAuth, async (_req, res) => {
  const row = await prisma.snapshot.findUnique({ where: { key: 'engine_state' } });
  res.json(row ?? {});
});


app.post('/api/v1/admin/snapshot/save', requireAuth, async (_req, res) => {
  await persistNow();
  res.json({ ok: true });
});

app.get('/api/v1/supportedAssets', async (_req, res) => {
  const rows = await prisma.asset.findMany({
    select: { symbol: true, name: true, imageUrl: true }
  });
  res.json({ assets: rows });
});

const CreateTradeBody = z.object({
  asset: z.string().min(1),
  type: z.enum(['long', 'short']),
  margin: z.number().int().positive(),
  leverage: z.number().int().min(1).max(100),
  slippage: z.number().int().min(0).max(10_000) 
});

app.post('/api/v1/trade/create', requireAuth, async (req, res) => {
  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const email = getUserEmail(req);
  const side = parsed.data.type === 'long' ? 'LONG' : 'SHORT';

  try {
    const out = await openTrade({
      email,
      asset: parsed.data.asset,
      side,
      marginCents: BigInt(parsed.data.margin),
      leverage: parsed.data.leverage,
      slippageBips: parsed.data.slippage
    });

    return res.json(out);
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Trade open failed' });
  }
});


const CloseTradeBody = z.object({ orderId: z.string().min(1) });
app.post('/api/v1/trade/close', requireAuth, async (req, res) => {
  const parsed = CloseTradeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  try {
    const out = await closeTrade({ orderId: parsed.data.orderId });
    return res.json({ orderId: parsed.data.orderId, pnl: out.pnl.toString() });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Trade close failed' });
  }
});


app.get('/api/v1/balance/usd', requireAuth, (req, res) => {
  const email = getUserEmail(req);
  const b = getUsdBalance(email);
  return res.json({ balance: Number(b.total) });
});

app.get('/api/v1/balance', requireAuth, async (_req, res) => {
  const assets = await prisma.asset.findMany({ select: { symbol: true, decimals: true } });
  const resp: Record<string, { balance: number, decimals: number }> = {};
  for (const a of assets) {
    resp[a.symbol] = { balance: 0, decimals: a.decimals };
  }
  return res.json(resp);
});


app.get('/api/v1/price', async (req, res) => {
  const asset = String(req.query.asset || '');
  if (!asset) return res.status(400).json({ error: 'asset required' });
  const out = await getHumanPrice(asset);
  if (!out) return res.status(404).json({ error: 'price unavailable' });
  return res.json(out);
});


app.post('/api/v1/admin/price', requireAuth, async (req, res) => {
  if (isProd) return res.status(403).json({ error: 'disabled in production' });
  const { asset, price } = req.body || {};
  if (!asset || (price === undefined || price === null)) {
    return res.status(400).json({ error: 'asset and price required' });
  }
  try {
    await setHumanPrice(String(asset), price);
    const out = await getHumanPrice(String(asset));
    return res.json({ ok: true, ...out });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'failed to set price' });
  }
});

import { redisPub } from './redis.js';
app.post('/api/v1/admin/redis/publish', requireAuth, async (req, res) => {
  await redisPub.publish('prices', JSON.stringify(req.body));
  res.json({ ok: true });
});

app.get('/api/v1/klines', async (req, res) => {
  const asset = String(req.query.asset || '');
  const interval = String(req.query.interval || '1m');
  const limit = Number(req.query.limit || 60);

  if (!asset) return res.status(400).json({ error: 'asset required' });
  if (interval !== '1m') return res.status(400).json({ error: 'only 1m supported for now' });
  if (!Number.isFinite(limit) || limit <= 0 || limit > 2000) {
    return res.status(400).json({ error: 'invalid limit' });
  }

  const data = getKlines(asset, limit);
  if (!data.length) return res.status(404).json({ error: 'no candles' });

  return res.json(data);
});


await initPricesFromDB();
await loadAndEnsure();


{
  const assets = await prisma.asset.findMany({ select: { symbol: true } });
  const seeds: Array<{ symbol: string; price: number }> = [];
  for (const a of assets) {
    const hp = await getHumanPrice(a.symbol);
    if (hp?.price) seeds.push({ symbol: a.symbol, price: Number(hp.price) });
  }
  initCandles(seeds, 120);
}

await startPriceSubscriber('prices');

app.listen(env.PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.PORT}`);
});

