type Bar = {
  t: number; 
  o: number; h: number; l: number; c: number;
};

const HISTORY = new Map<string, Bar[]>();         
const LIVE = new Map<string, Bar>();              
const MAX_BARS = 1000;                            

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

    for (let i = warmupBars; i > 0; i--) {
      const t = bucket - i * 60_000;
      hist.push({ t, o: price, h: price, l: price, c: price });
    }
    HISTORY.set(symbol, hist);
    LIVE.set(symbol, { t: bucket, o: price, h: price, l: price, c: price });
  }
}

export function recordTick(symbol: string, price: number, atMs = Date.now()) {
  const bucket = minuteBucket(atMs);

  const cur = LIVE.get(symbol);
  if (!cur || cur.t !== bucket) {

    if (cur) {
      const hist = HISTORY.get(symbol) ?? [];
      hist.push(cur);
      if (hist.length > MAX_BARS) hist.splice(0, hist.length - MAX_BARS);
      HISTORY.set(symbol, hist);
    }

    LIVE.set(symbol, { t: bucket, o: price, h: price, l: price, c: price });
    return;
  }

  cur.c = price;
  if (price > cur.h) cur.h = price;
  if (price < cur.l) cur.l = price;
}

export function getKlines(symbol: string, limit = 60): Array<[number, number, number, number, number, number]> {
  const hist = HISTORY.get(symbol) ?? [];
  const cur = LIVE.get(symbol);


  const all = cur ? [...hist, cur] : [...hist];


  if (all.length === 0) return [];
  
  const slice = all.slice(-limit);
  return slice.map(b => [b.t, b.o, b.h, b.l, b.c, 0]);
}
