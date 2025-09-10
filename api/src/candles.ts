type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
const BOOK: Record<string, Candle[]> = {};
const MAX_STORE = 2000;

function minuteStart(ts: number = Date.now()) {
  return Math.floor(ts / 60000) * 60000;
}

export function initCandles(seeds: Array<{ symbol: string; price: number }>, seedLen = 120) {
  for (const s of seeds) {
    const arr: Candle[] = [];
    const base = minuteStart();
    for (let i = seedLen - 1; i >= 0; i--) {
      const t = base - i * 60000;
      arr.push({ t, o: s.price, h: s.price, l: s.price, c: s.price, v: 0 });
    }
    BOOK[s.symbol] = arr;
  }
}

// record a tick into current 1m candle
export function recordPrice(symbol: string, price: number) {
  if (!BOOK[symbol]) BOOK[symbol] = [];
  const now = minuteStart();
  const last = BOOK[symbol][BOOK[symbol].length - 1];

  if (!last || last.t !== now) {
    BOOK[symbol].push({ t: now, o: price, h: price, l: price, c: price, v: 0 });
  } else {
    last.c = price;
    if (price > last.h) last.h = price;
    if (price < last.l) last.l = price;
  }

  if (BOOK[symbol].length > MAX_STORE) BOOK[symbol].splice(0, BOOK[symbol].length - MAX_STORE);
}

// GET klines (1m only for now)
export function getKlines(symbol: string, limit = 100) {
  const src = BOOK[symbol] || [];
  const slice = src.slice(Math.max(0, src.length - limit));
  // standard kline array: [openTime, open, high, low, close, volume]
  return slice.map(c => [c.t, c.o, c.h, c.l, c.c, c.v]);
}
