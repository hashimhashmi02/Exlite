import WebSocket from "ws";

export type Sym = "BTC" | "ETH" | "SOL" | "XRP" | "DOGE" | "ADA" | "AVAX" | "MATIC" | "LINK";
type Quote = { bid: number; ask: number; mid: number; decimals: number };

const MAP: Record<Sym, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solusdt",
  XRP: "xrpusdt",
  DOGE: "dogeusdt",
  ADA: "adausdt",
  AVAX: "avaxusdt",
  MATIC: "maticusdt",
  LINK: "linkusdt",
};

const last: Record<Sym, Quote> = {
  BTC: { bid: 96000, ask: 96100, mid: 96050, decimals: 2 },
  ETH: { bid: 2700, ask: 2705, mid: 2702, decimals: 2 },
  SOL: { bid: 150, ask: 151, mid: 150.5, decimals: 2 },
  XRP: { bid: 2.30, ask: 2.31, mid: 2.305, decimals: 4 },
  DOGE: { bid: 0.25, ask: 0.26, mid: 0.255, decimals: 5 },
  ADA: { bid: 0.90, ask: 0.91, mid: 0.905, decimals: 4 },
  AVAX: { bid: 40, ask: 41, mid: 40.5, decimals: 2 },
  MATIC: { bid: 0.60, ask: 0.61, mid: 0.605, decimals: 4 },
  LINK: { bid: 20, ask: 20.1, mid: 20.05, decimals: 2 },
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
  const url = `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Exlite/1.0" } });
    if (!res.ok) {
      console.error("Binance K-lines failed:", res.status, await res.text());
      return [];
    }
    const raw = (await res.json()) as any[];
    return raw.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5]]);
  } catch (e) {
    console.error("Binance fetch error:", e);
    return [];
  }
}


export async function initPricesFromDB() {

}


export async function startPricesSubscriber(
  cb?: (sym: Sym, price: number, decimals?: number) => void
) {
  const streams = Object.values(MAP)
    .map((p) => `${p}@bookTicker`)
    .join("/");
  const URL = `wss://data-stream.binance.vision:9443/stream?streams=${streams}`;

  let ws: WebSocket | null = null;
  let killed = false;

  const connect = () => {
    if (killed) return;
    ws = new WebSocket(URL);

    ws.on("open", () => {
      console.log("✅ API connected to Binance Stream");
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
