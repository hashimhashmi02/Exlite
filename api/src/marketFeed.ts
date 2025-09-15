import WebSocket from 'ws';

export type Asset = 'BTC' | 'ETH' | 'SOL';

type Quote = { bid: number; ask: number; mid: number; decimals: number };
type Candle = {
  t: number; 
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

const BINANCE = 'wss://stream.binance.com:9443/stream';
const mapToBinance: Record<Asset, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  SOL: 'solusdt',
};

const quotes: Record<Asset, Quote> = {
  BTC: { bid: NaN, ask: NaN, mid: NaN, decimals: 2 },
  ETH: { bid: NaN, ask: NaN, mid: NaN, decimals: 2 },
  SOL: { bid: NaN, ask: NaN, mid: NaN, decimals: 2 },
};

const candles: Record<Asset, Candle[]> = { BTC: [], ETH: [], SOL: [] };
const MAX = 2000;


type SSE = { id: number; write: (s: string) => void; end: () => void };
const sseClients = new Map<number, SSE>();
let sseId = 1;
function broadcastQuotes() {
  const payload = JSON.stringify({ type: 'quotes', quotes });
  for (const c of sseClients.values()) {
    try {
      c.write(`data: ${payload}\n\n`);
    } catch {}
  }
}
export function registerSse(res: any) {
  const id = sseId++;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('\n');
  const client: SSE = {
    id,
    write: (s) => res.write(s),
    end: () => res.end(),
  };
  sseClients.set(id, client);
  // push snapshot immediately
  res.write(`data: ${JSON.stringify({ type: 'quotes', quotes })}\n\n`);
  reqOnClose(res, () => sseClients.delete(id));
}

function reqOnClose(res: any, cb: () => void) {
  const fn = () => cb();
  res.on('close', fn);
  res.on('finish', fn);
}

// ---- public getters ----
export function getQuoteSnapshot(assets: Asset[]) {
  const out: Record<string, Quote> = {};
  for (const a of assets) {
    const q = quotes[a];
    if (q) out[a] = q;
  }
  return out;
}
export function getCandles(asset: Asset, limit = 60): Candle[] {
  const arr = candles[asset] || [];
  return arr.slice(Math.max(0, arr.length - limit));
}

// ---- bootstrap the feed ----
export async function startBinanceFeed(assets: Asset[]) {
  // build combined stream: kline + bookTicker for each asset
  const parts: string[] = [];
  for (const a of assets) {
    const s = mapToBinance[a];
    parts.push(`${s}@kline_1m`);
    parts.push(`${s}@bookTicker`);
  }
  const url = `${BINANCE}?streams=${parts.join('/')}`;
  const ws = new WebSocket(url);

  ws.on('open', () => {
    // console.log('[feed] connected');
  });

  ws.on('message', (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      const stream: string = msg?.stream || '';
      const data = msg?.data;

      // bookTicker (bid/ask)
      if (stream.endsWith('bookTicker') && data?.s) {
        const a = fromBinanceSymbol(data.s);
        if (!a) return;
        const bid = Number(data.b);
        const ask = Number(data.a);
        if (Number.isFinite(bid) && Number.isFinite(ask)) {
          const mid = (bid + ask) / 2;
          quotes[a] = { bid, ask, mid, decimals: 2 };
          broadcastQuotes();
        }
        return;
      }

      // kline 1m
      if (stream.includes('@kline_1m') && data?.k) {
        const k = data.k; // binance kline payload
        const a = fromBinanceSymbol(data.s);
        if (!a) return;

        const t = Number(k.t); // open time ms
        const o = Number(k.o);
        const h = Number(k.h);
        const l = Number(k.l);
        const c = Number(k.c);
        const v = Number(k.v);
        const closed = Boolean(k.x);

        if (!Number.isFinite(t) || !Number.isFinite(o)) return;

        const arr = candles[a];
        const last = arr[arr.length - 1];

        if (!last || last.t !== t) {
          arr.push({ t, o, h, l, c, v });
          if (arr.length > MAX) arr.splice(0, arr.length - MAX);
        } else {
          // update in-flight candle
          last.o = o;
          last.h = Math.max(last.h, h);
          last.l = Math.min(last.l, l);
          last.c = c;
          last.v = v;
        }
        // when candle closes, the next message will start a new bar
        return;
      }
    } catch {
      // swallow
    }
  });

  ws.on('close', () => {
    setTimeout(() => startBinanceFeed(assets), 1500);
  });

  // Preload some history using Binance REST (best-effort)
  await preloadHistory(assets).catch(() => {});
}

async function preloadHistory(assets: Asset[]) {
  // tiny REST preload to avoid empty chart at first paint
  const fetch = (await import('node-fetch')).default as any;
  for (const a of assets) {
    const s = mapToBinance[a].toUpperCase();
    const url = `https://api.binance.com/api/v3/klines?symbol=${s}&interval=1m&limit=300`;
    const raw = await fetch(url).then((r: any) => r.json());
    // each row: [ openTime, open, high, low, close, volume, closeTime, ...]
    const rows: Candle[] = raw.map((r: any[]) => ({
      t: Number(r[0]),
      o: Number(r[1]),
      h: Number(r[2]),
      l: Number(r[3]),
      c: Number(r[4]),
      v: Number(r[5]),
    }));
    candles[a] = rows;
  }
}

function fromBinanceSymbol(s: string): Asset | null {
  const low = s.toLowerCase();
  if (low === 'btcusdt') return 'BTC';
  if (low === 'ethusdt') return 'ETH';
  if (low === 'solusdt') return 'SOL';
  return null;
}
