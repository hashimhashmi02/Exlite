import { redisSub } from './redis.js';
type Side = 'LONG' | 'SHORT';

type OpenOrder = {
  orderId: string;
  email: string;
  asset: string;
  side: Side;
  marginCents: bigint;
  leverage: number;
  entryPrice: number;
  assetDecimals: number;
  openedAt: number; // ms
};

export type Quote = {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  decimals: number;
};

type Candle = [tsMs: number, open: number, high: number, low: number, close: number, volume: number];

const SPREAD_BIPS = 20;
const MAX_CANDLES = 5000;

const priceStore = new Map<string, { price: number; decimals: number }>();
const openOrdersByEmail = new Map<string, OpenOrder[]>();
const candlesBySymbol = new Map<string, Candle[]>();

const bucket = (ms: number) => Math.floor(ms / 60_000) * 60_000;

function noteTick(symbol: string, price: number, tsMs = Date.now()) {
  let arr = candlesBySymbol.get(symbol);
  if (!arr) {
    arr = [];
    candlesBySymbol.set(symbol, arr);
  }
  const b = bucket(tsMs);
  const last = arr[arr.length - 1];

  if (!last || last[0] !== b) {
    arr.push([b, price, price, price, price, 0]);
    if (arr.length > MAX_CANDLES) arr.shift();
  } else {
    if (price > last[2]) last[2] = price;
    if (price < last[3]) last[3] = price; 
    last[4] = price;                      
  }
}

function seedCandlesIfMissing(symbol: string, price: number, count = 120) {
  let arr = candlesBySymbol.get(symbol);
  if (arr && arr.length) return;

  const now = Date.now();
  arr = [];
  const pad = Math.max(0.01, price * 0.00001);
  for (let i = count - 1; i >= 0; i--) {
    const ts = bucket(now - i * 60_000);
    arr.push([ts, price, price + pad, price - pad, price, 0]);
  }
  candlesBySymbol.set(symbol, arr);
}

/** Make fully flat bars visible */
function widenFlat(c: Candle): Candle {
  const [t, o, h, l, cl, v] = c;
  if (h === l) {
    const pad = Math.max(0.01, Math.abs(h) * 0.00001);
    const nh = h + pad;
    const nl = l - pad;
    const ncl = cl === o ? (cl + (Math.random() < 0.5 ? -pad * 0.4 : pad * 0.4)) : cl;
    return [t, o, nh, nl, ncl, v];
  }
  return c;
}
export const assetToBinance = (asset: string) => {
  const a = asset.toUpperCase();
  if (a === 'BTC') return 'BTCUSDT';
  if (a === 'ETH') return 'ETHUSDT';
  if (a === 'SOL') return 'SOLUSDT';
  return 'BTCUSDT';
};



/** Public: GET quotes */
export function getQuote(symbol: string): Quote | null {
  const p = priceStore.get(symbol);
  if (!p) return null;
  const mid = p.price;
  const spr = mid * (SPREAD_BIPS / 10_000);
  return {
    symbol,
    bid: +(mid - spr / 2).toFixed(p.decimals),
    ask: +(mid + spr / 2).toFixed(p.decimals),
    mid: +mid.toFixed(p.decimals),
    decimals: p.decimals,
  };
}

export function getQuotes(symbols: string[]): { quotes: Record<string, Quote>, spreadBips: number } {
  const out: Record<string, Quote> = {};
  for (const s of symbols) {
    const q = getQuote(s);
    if (q) out[s] = q;
  }
  return { quotes: out, spreadBips: SPREAD_BIPS };
}

export async function getHumanPrice(symbol: string): Promise<{ symbol: string; price: string; decimals: number; raw: string } | null> {
  const p = priceStore.get(symbol);
  if (!p) return null;
  const mult = 10 ** p.decimals;
  return {
    symbol,
    price: p.price.toFixed(p.decimals),
    decimals: p.decimals,
    raw: Math.round(p.price * mult).toString(),
  };
}

export async function setHumanPrice(symbol: string, price: number, decimals = 4) {
  priceStore.set(symbol, { price, decimals });
  seedCandlesIfMissing(symbol, price);
  noteTick(symbol, price);
}

export function getKlines(symbol: string, limit = 60): Candle[] {
  const arr = candlesBySymbol.get(symbol) ?? [];
  const out = arr.slice(-limit).map(widenFlat);
  return out;
}

/** ---------------- Orders (demo/paper) ---------------- */
export function getUsdBalance(_email: string) {
  return { total: 1_000_000 };
}
export function listOpenOrdersByEmail(email: string): OpenOrder[] {
  return openOrdersByEmail.get(email) ?? [];
}
export async function openTrade(args: {
  email: string; asset: string; side: Side;
  marginCents: bigint; leverage: number; slippageBips: number;
}) {
  const p = priceStore.get(args.asset);
  if (!p) throw new Error('price unavailable');

  const id = crypto.randomUUID();
  const ord: OpenOrder = {
    orderId: id,
    email: args.email,
    asset: args.asset,
    side: args.side,
    marginCents: args.marginCents,
    leverage: args.leverage,
    entryPrice: p.price,
    assetDecimals: p.decimals,
    openedAt: Date.now(),
  };
  const arr = openOrdersByEmail.get(args.email) ?? [];
  arr.push(ord);
  openOrdersByEmail.set(args.email, arr);
  return { orderId: id };
}
export async function closeTrade(args: { orderId: string }) {
  for (const [email, arr] of openOrdersByEmail.entries()) {
    const i = arr.findIndex(o => o.orderId === args.orderId);
    if (i !== -1) {
      const [ord] = arr.splice(i, 1);
      openOrdersByEmail.set(email, arr);
      const p = priceStore.get(ord.asset);
      const exit = p ? p.price : ord.entryPrice;
      const pnl = Math.round((exit - ord.entryPrice) * Number(ord.marginCents) * ord.leverage / 100);
      return { pnl: BigInt(pnl) };
    }
  }
  throw new Error('order not found');
}

/** ---------------- Boot ---------------- */
export async function initPricesFromDB() {
  if (!priceStore.size) {
    await setHumanPrice('BTC', 113000, 4);
    await setHumanPrice('ETH', 4330, 4);
    await setHumanPrice('SOL', 223, 4);
  }
}

/** Robust Redis subscriber (accepts multiple shapes; ignores junk) */
export async function startPriceSubscriber(channel = 'prices') {
  // ioredis style: subscribe then listen on 'message'
  try {
    await (redisSub as any).subscribe(channel);
  } catch (e) {
    console.error('redis subscribe failed:', e);
  }

  (redisSub as any).on('message', (ch: string, msg: string) => {
    if (ch !== channel) return;
    if (typeof msg !== 'string' || msg.trim() === '') return;

    let data: any;
    try { data = JSON.parse(msg); } catch { return; }
    if (!data || typeof data !== 'object') return;

    // Support: {price_updates:[...]}, {updates:[...]}, {ticks:[...]}, or raw array
    const arr =
      Array.isArray(data) ? data :
      data.price_updates ?? data.updates ?? data.ticks ?? [];

    if (!Array.isArray(arr)) return;

    for (const u of arr) {
      if (!u || typeof u.asset !== 'string' || u.price === undefined) continue;
      const symbol = u.asset;
      const price = Number(u.price);
      if (!Number.isFinite(price)) continue;

      const decimals =
        Number.isFinite(Number(u.decimal)) ? Number(u.decimal) :
        (priceStore.get(symbol)?.decimals ?? 4);

      // store + candles
      priceStore.set(symbol, { price, decimals });
      seedCandlesIfMissing(symbol, price);
      noteTick(symbol, price);
    }
  });
}
