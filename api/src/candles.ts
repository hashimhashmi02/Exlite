type Bar = {
  t: number; // bucket ms (start of minute)
  o: number; h: number; l: number; c: number;
};

const HISTORY = new Map<string, Bar[]>();         // symbol -> last N bars (newest last)
const LIVE = new Map<string, Bar>();              // symbol -> current open bar (minute bucket)
const MAX_BARS = 1000;                            // keep enough history for UI limits

function minuteBucket(ms: number) {
  return Math.floor(ms / 60_000) * 60_000;
}

export function initCandles(
  seeds: Array<{ symbol: string; price: number }>,
  warmupBars = 120
) {
  for (const { symbol, price } of seeds) {
    const now = Date.now();
    const bucket = minuteBucket(now);
    const hist: Bar[] = [];

    // warmup with “flat” bars (so UI has something immediately)
    for (let i = warmupBars; i > 0; i--) {
      const t = bucket - i * 60_000;
      hist.push({ t, o: price, h: price, l: price, c: price });
    }
    HISTORY.set(symbol, hist);
    LIVE.set(symbol, { t: bucket, o: price, h: price, l: price, c: price });
  }
}

/** Record a tick (human price) and update the current 1m bar */
export function recordTick(symbol: string, price: number, atMs = Date.now()) {
  const bucket = minuteBucket(atMs);

  const cur = LIVE.get(symbol);
  if (!cur || cur.t !== bucket) {
    // minute rolled: push previous live bar into history
    if (cur) {
      const hist = HISTORY.get(symbol) ?? [];
      hist.push(cur);
      if (hist.length > MAX_BARS) hist.splice(0, hist.length - MAX_BARS);
      HISTORY.set(symbol, hist);
    }
    // start new bar
    LIVE.set(symbol, { t: bucket, o: price, h: price, l: price, c: price });
    return;
  }

  // update current bar
  cur.c = price;
  if (price > cur.h) cur.h = price;
  if (price < cur.l) cur.l = price;
}

/** Return klines in Binance-style shape: [time_ms, open, high, low, close, volume] */
export function getKlines(symbol: string, limit = 60): Array<[number, number, number, number, number, number]> {
  const hist = HISTORY.get(symbol) ?? [];
  const cur = LIVE.get(symbol);

  // compose list newest last
  const all = cur ? [...hist, cur] : [...hist];

  // guard: if completely empty, return []
  if (all.length === 0) return [];

  // take the last <limit> and map
  const slice = all.slice(-limit);
  return slice.map(b => [b.t, b.o, b.h, b.l, b.c, 0]);
}
