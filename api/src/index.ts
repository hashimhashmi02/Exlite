import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { proxyKlines, proxyTicker, streamKlinesSSE } from './market.js';
import { env, isProd } from './env.js';
import { prisma } from './db.js';
import {
  startBinanceFeed,
  getQuoteSnapshot,
  getCandles,
  registerSse,
  type Asset as LiveAsset,
} from './marketFeed.js';

import {
  initPricesFromDB,
  startPriceSubscriber,
  getHumanPrice,
  setHumanPrice,
  getKlines,
  getUsdBalance,
  getQuotes,
  openTrade,
  closeTrade,
  listOpenOrdersByEmail
} from './engine.js';

import { createMagicToken, verifyMagicToken, createSessionToken, verifySessionToken } from './auth.js';
import { requireAuth, getUserEmail } from './middleware.js';
import { sendMagicLinkEmail } from './email.js';
import { redisPub } from './redis.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.set('json replacer', (_k: any, v: { toString: () => any; }) => (typeof v === 'bigint' ? v.toString() : v));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/v1/market/klines', proxyKlines);
app.get('/api/v1/market/ticker', proxyTicker);
app.get('/api/v1/market/stream', streamKlinesSSE);



// live quotes (Bid/Ask/Mid)
app.get('/api/v1/quotes', (_req, res) => {
  const q = String(_req.query.assets || '').split(',').filter(Boolean) as LiveAsset[];
  if (!q.length) return res.json({ quotes: {}, spreadBips: 0 });
  const snap = getQuoteSnapshot(q);
  // simple constant spread for UI (optional)
  res.json({ quotes: snap, spreadBips: 5 });
});


const EmailBody = z.object({ email: z.string().email() });

app.post('/api/v1/signin', async (req, res) => {
  const parsed = EmailBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });

  const { email } = parsed.data;
  const token = createMagicToken(email);
  const url = `${env.BACKEND_URL}/api/v1/signin/post?token=${encodeURIComponent(token)}`;

  try {
    await sendMagicLinkEmail(email, url);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('send mail error:', e?.message || e);
    res.status(500).json({ error: 'mail failed' });
  }
});

app.get('/api/v1/signin/post', async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(400).send('missing token');
  try {
    const { email } = verifyMagicToken(token);
    await prisma.user.upsert({ where: { email }, update: {}, create: { email } });

    const session = createSessionToken(email);
    res.cookie('session', session, {
      httpOnly: true, secure: isProd, sameSite: 'lax', path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const target = new URL(env.FRONTEND_URL);
    target.searchParams.set('signedIn', '1');
    res.redirect(target.toString());
  } catch {
    res.status(400).send('Invalid or expired token');
  }
});

app.get('/api/v1/me', (req, res) => {
  const token = req.cookies?.session as string | undefined;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const p = verifySessionToken(token);
    res.json({ authenticated: true, email: p.email });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

/** -------- Market/Quotes -------- */
app.get('/api/v1/supportedAssets', async (_req, res) => {
  const rows = await prisma.asset.findMany({ select: { symbol: true, name: true, imageUrl: true } });
  res.json({ assets: rows });
});

// Returns bid/ask/mid for a comma-separated list of assets, e.g. BTC,ETH,SOL
app.get('/api/v1/quotes', async (req, res) => {
  const assets = String(req.query.assets || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (!assets.length) return res.status(400).json({ error: 'assets required' });

  const quotes = getQuotes(assets);
  // Include a tiny spreadBips helper (0 if we only have mid)
  const spreadBips = 0;
  res.json({ quotes, spreadBips });
});

app.get('/api/v1/price', async (req, res) => {
  const asset = String(req.query.asset || '') as LiveAsset;
  if (!asset) return res.status(400).json({ error: 'asset required' });
  const snap = getQuoteSnapshot([asset]);
  const q = snap[asset];
  if (!q || !Number.isFinite(q.mid)) return res.status(404).json({ error: 'price unavailable' });
  return res.json({ symbol: asset, price: q.mid.toFixed(4), decimals: 4, raw: String(Math.round(q.mid * 10_000)) });
});

/** Admin helpers */
app.post('/api/v1/admin/price', requireAuth, async (req, res) => {
  if (isProd) return res.status(403).json({ error: 'disabled in production' });
  const { asset, price, decimals } = req.body || {};
  if (!asset || price === undefined) return res.status(400).json({ error: 'asset, price required' });
  await setHumanPrice(String(asset), Number(price), Number(decimals ?? 4));
  const out = await getHumanPrice(String(asset));
  res.json({ ok: true, ...out });
});

app.post('/api/v1/admin/redis/publish', requireAuth, async (req, res) => {
  // Optional: basic validation to avoid null payload
  const body = req.body;
  if (!body || typeof body !== 'object' || !Array.isArray((body as any).price_updates)) {
    return res.status(400).json({ error: 'price_updates array required' });
  }
  await redisPub.publish('prices', JSON.stringify(body));
  res.json({ ok: true });
});




/** -------- Trading -------- */
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
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Trade open failed' });
  }
});

const CloseTradeBody = z.object({ orderId: z.string().min(1) });

app.post('/api/v1/trade/close', requireAuth, async (req, res) => {
  const parsed = CloseTradeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  try {
    const out = await closeTrade({ orderId: parsed.data.orderId });
    return res.json({ orderId: parsed.data.orderId, pnl: String(out.pnl) });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Trade close failed' });
  }
});

app.get('/api/v1/openOrders', requireAuth, async (req, res) => {
  const email = (req as any).email || (req as any).user?.email || (req as any).userEmail;
  if (!email) return res.status(401).json({ error: 'No session' });

  const raw = listOpenOrdersByEmail(email);

  const orders = raw.map(o => ({
    orderId: String(o.orderId),
    asset: o.asset,
    side: o.side,                     
    marginCents: String(o.marginCents),
    leverage: Number(o.leverage),
    entryPrice: o.entryPrice != null ? String(o.entryPrice) : undefined,
    assetDecimals: Number(o.assetDecimals),
  }));

  res.json({ orders });
});

app.get('/api/v1/balance/usd', requireAuth, (req, res) => {
  const email = getUserEmail(req);
  res.json({ balance: Number(getUsdBalance(email).total) });
});

app.get('/api/v1/klines', async (req, res) => {
  const asset = String(req.query.asset || '') as LiveAsset;
  const interval = String(req.query.interval || '1m');
  const limit = Number(req.query.limit || 60);
  if (!asset) return res.status(400).json({ error: 'asset required' });
  if (interval !== '1m') return res.status(400).json({ error: 'only 1m supported for now' });
  const rows = getCandles(asset, Math.min(Math.max(1, limit), 2000));
  if (!rows.length) return res.status(404).json({ error: 'no candles' });
  const out = rows.map((r) => [r.t, r.o, r.h, r.l, r.c, r.v]);
  res.json(out);
});

await initPricesFromDB();
await startPriceSubscriber('prices');

await startBinanceFeed(['BTC','ETH','SOL']);


app.listen(env.PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.PORT}`);
});