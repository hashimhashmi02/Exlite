import WebSocket from "ws";

export type Sym = "BTC" | "ETH" | "SOL";
type Quote = { bid: number; ask: number; mid: number; decimals: number };

const MAP: Record<Sym, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solusdt",
};

const last: Record<Sym, Quote> = {
  BTC: { bid: 0, ask: 0, mid: 0, decimals: 2 },
  ETH: { bid: 0, ask: 0, mid: 0, decimals: 2 },
  SOL: { bid: 0, ask: 0, mid: 0, decimals: 2 },
};

const subs = new Set<(payload: { quotes: Record<Sym, Quote> }) => void>();
function emit() {
  const payload = { quotes: { ...last } };
  subs.forEach((fn) => fn(payload));
}
export function onQuote(fn: (payload: { quotes: Record<Sym, Quote> }) => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}


export function getQuotes() {
  return last;
}

export async function getKlines(
  asset: Sym | string,
  interval = "1m",
  limit = 240
): Promise<[number, string, string, string, string, string][]> {
  const sym = (String(asset).toUpperCase() as Sym) || "BTC";
  const pair = MAP[sym].toUpperCase();
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const raw = (await res.json()) as any[];

  return raw.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5]]);
}


export async function initPricesFromDB() {

}


export async function startPricesSubscriber(
  cb?: (sym: Sym, price: number, decimals?: number) => void
) {
  const streams = Object.values(MAP)
    .map((p) => `${p}@bookTicker`)
    .join("/");
  const URL = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  let ws: WebSocket | null = null;
  let killed = false;

  const connect = () => {
    if (killed) return;
    ws = new WebSocket(URL);

    ws.on("open", () => {
   
    });

    ws.on("message", (buf) => {
      try {
        const msg = JSON.parse(buf.toString());
        const stream: string = msg.stream; 
        const data = msg.data; 
        const pair = stream.split("@")[0];
        const entry = Object.entries(MAP).find(([, v]) => v === pair);
        if (!entry) return;
        const sym = entry[0] as Sym;

        const bid = Number(data.b);
        const ask = Number(data.a);
        if (!isFinite(bid) || !isFinite(ask)) return;

        const mid = (bid + ask) / 2;
        last[sym] = { bid, ask, mid, decimals: 2 };

   
        emit();
        cb?.(sym, mid, 2);
      } catch {}
    });

    ws.on("close", () => {
      if (killed) return;
      setTimeout(connect, 1000);
    });

    ws.on("error", () => {
      try {
        ws?.close();
      } catch {}
    });
  };

  connect();

  return () => {
    killed = true;
    try {
      ws?.close();
    } catch {}
  };
}
