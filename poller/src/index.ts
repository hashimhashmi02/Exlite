import 'dotenv/config';
import { Redis } from 'ioredis';
import WebSocket from 'isomorphic-ws';
import { z } from 'zod';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const BINANCE_BASE = process.env.BINANCE_STREAM_BASE || 'wss://stream.binance.com:9443/stream';
const CHANNEL = process.env.PUBLISH_CHANNEL || 'prices';
const AGG_MS = Number(process.env.AGGREGATE_MS || 100);


const pub = new Redis(REDIS_URL);
pub.on('error', (e) => console.error('redis pub error:', e));

type AssetInfo = { symbol: string; decimals: number; binance: string };


function toBinanceSymbol(sym: string): string | null {
  const m: Record<string, string> = {
    BTC: 'btcusdt',
    ETH: 'ethusdt',
    SOL: 'solusdt'
  };
  return m[sym] || null;
}

function toScaledBigInt(human: number | string, decimals: number): bigint {
  const s = typeof human === 'number' ? human.toString() : human;
  const neg = s.startsWith('-');
  const [iRaw, fRaw = ''] = (neg ? s.slice(1) : s).split('.');
  const i = iRaw.replace(/\D/g, '') || '0';
  const f = (fRaw + '0'.repeat(decimals)).slice(0, decimals);
  const scaled = BigInt(i) * BigInt(10 ** decimals) + BigInt(f || '0');
  return neg ? -scaled : scaled;
}

async function loadAssets(): Promise<AssetInfo[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/supportedAssets`);
  if (!res.ok) throw new Error(`supportedAssets HTTP ${res.status}`);
  const json = await res.json();
  const Row = z.object({ symbol: z.string(), name: z.string(), imageUrl: z.string().optional() });
  const Data = z.object({ assets: z.array(Row) });
  const parsed = Data.parse(json);


  const balRes = await fetch(`${BACKEND_URL}/api/v1/balance`, { headers: { cookie: '' } }).catch(() => null);

  const defaultDec: Record<string, number> = { BTC: 4, ETH: 4, SOL: 6 };

  let decimalsMap: Record<string, number> = {};
  if (balRes && balRes.ok) {
    const m = await balRes.json().catch(() => ({}));
    for (const [k, v] of Object.entries<any>(m || {})) {
      if (typeof v?.decimals === 'number') decimalsMap[k] = v.decimals;
    }
  }

  return parsed.assets
    .map((a): AssetInfo | null => {
      const binance = toBinanceSymbol(a.symbol);
      const decimals = decimalsMap[a.symbol] ?? defaultDec[a.symbol] ?? 4;
      if (!binance) return null;
      return { symbol: a.symbol, decimals, binance };
    })
    .filter(Boolean) as AssetInfo[];
}


type LatestMap = Record<string, { price: bigint; decimal: number; changed: boolean }>;

async function start() {
  const assets = await loadAssets();
  if (!assets.length) throw new Error('No assets to stream');

  const streams = assets.map(a => `${a.binance}@trade`).join('/');
  const url = `${BINANCE_BASE}?streams=${streams}`;
  console.log('🔌 Connecting WS:', url);

  const latest: LatestMap = {};
  for (const a of assets) {
    latest[a.symbol] = { price: 0n, decimal: a.decimals, changed: false };
  }

  let ws: WebSocket;
  let alive = false;
  let reconnectMs = 1000;

  const open = () => new Promise<void>((resolve) => {
    ws = new WebSocket(url);

    ws.onopen = () => {
      alive = true;
      reconnectMs = 1000;
      console.log('✅ WS connected');
      resolve();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);

        const stream: string = msg?.stream || '';
        const priceStr: string | undefined = msg?.data?.p; 
        if (!stream || !priceStr) return;

        const pair = stream.split('@')[0]; 
        const match = assets.find(a => a.binance === pair);
        if (!match) return;

        const scaled = toScaledBigInt(priceStr, match.decimals);
        latest[match.symbol] = { price: scaled, decimal: match.decimals, changed: true };
      } catch {}
    };

    ws.onclose = () => {
      alive = false;
      console.warn('⚠️ WS closed, reconnecting in', reconnectMs, 'ms');
      setTimeout(connect, reconnectMs);
      reconnectMs = Math.min(reconnectMs * 2, 30000);
    };

    ws.onerror = (e) => {
      console.error('WS error:', e);
      try { ws.close(); } catch {}
    };
  });

  const connect = async () => {
    try { await open(); } catch (e) {
      console.error('WS connect failed:', e);
      setTimeout(connect, reconnectMs);
      reconnectMs = Math.min(reconnectMs * 2, 30000);
    }
  };

  await connect();

  setInterval(async () => {
    if (!alive) return;
    const payload = [];
    for (const [asset, v] of Object.entries(latest)) {
      if (!v.changed) continue;
      payload.push({ asset, price: v.price.toString(), decimal: v.decimal });
      v.changed = false;
    }
    if (payload.length) {
      const norm = payload.map(u => ({ asset: u.asset, price: Number(u.price), decimal: u.decimal }));
      await pub.publish(CHANNEL, JSON.stringify({ price_updates: norm })).catch(() => {});
    }
  }, AGG_MS);
}

start().catch((e) => {
  console.error('Poller fatal:', e);
  process.exit(1);
});
