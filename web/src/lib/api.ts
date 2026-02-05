export type Me = { authenticated: boolean; email?: string };
export type Asset = { symbol: string; name: string; imageUrl: string };
export type Quote = { symbol: string; bid: number; ask: number; mid: number; decimals: number };
export type UsdBalance = { balance: number };
export type AllBalances = Record<string, { balance: number; decimals: number }>;
export type PriceResp = { symbol: string; price: string; decimals: number; raw: string };

export type TradeCreateBody = {
  asset: string;
  type: "long" | "short";
  margin: number;
  leverage: number;
  slippage: number;
};
export type TradeCreateResp = { orderId: string };
export type TradeCloseResp = { orderId: string; pnl: string };

export type OpenOrderDTO = {
  orderId: string;
  asset: string;
  side: "LONG" | "SHORT";
  marginCents: string;
  leverage: number;
  entryPrice?: string;
  assetDecimals: number;
};

export type Kline = [number, number, number, number, number, number];

const BASE = import.meta.env.VITE_API_BASE || "https://exlite-1.onrender.com";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if ((body as any)?.error) msg = (body as any).error;
    } catch {}
    throw new Error(msg);
  }
  return (res.json() as unknown) as T;
}

export const api = {

  me: (): Promise<Me> =>
    fetch(`${BASE}/api/v1/me`, { credentials: "include" }).then((r) => json<Me>(r)),


  signin: (
    email: string
  ): Promise<{ ok: true; magicUrl?: string; email?: string }> =>
    fetch(`${BASE}/api/v1/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    }).then((r) => json(r)),

    
  exchangeMagic: (token: string): Promise<{ ok: true; email: string }> =>
    fetch(`${BASE}/api/v1/magic/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    }).then((r) => json(r)),

  logout: (): Promise<{ ok: true }> =>
    fetch(`${BASE}/api/v1/logout`, {
      method: "POST",
      credentials: "include",
    }).then((r) => json(r)),

  supportedAssets: (): Promise<{ assets: Asset[] }> =>
    fetch(`${BASE}/api/v1/supportedAssets`, { credentials: "include" })
      .then((r) => json<{ assets: Asset[] }>(r)),
};

export const quotes = {
  get: (assets: string[]): Promise<{ quotes: Record<string, Quote>; spreadBips: number }> =>
    fetch(
      `${BASE}/api/v1/quotes?assets=${encodeURIComponent(assets.join(","))}`,
      { credentials: "include" }
    ).then((r) => json<{ quotes: Record<string, Quote>; spreadBips: number }>(r)),
};

export const orders = {
  open: (): Promise<{ orders: OpenOrderDTO[] }> =>
    fetch(`${BASE}/api/v1/openOrders`, { credentials: "include" })
      .then((r) => json<{ orders: OpenOrderDTO[] }>(r)),

  closed: (): Promise<{ orders: any[] }> =>
    fetch(`${BASE}/api/v1/closedOrders`, { credentials: "include" })
      .then((r) => json<{ orders: any[] }>(r)),
};

export const trading = {
  price: (asset: string): Promise<PriceResp> =>
    fetch(`${BASE}/api/v1/price?asset=${encodeURIComponent(asset)}`, {
      credentials: "include",
    }).then((r) => json<PriceResp>(r)),

  balanceUsd: (): Promise<UsdBalance> =>
    fetch(`${BASE}/api/v1/balance/usd`, { credentials: "include" })
      .then((r) => json<UsdBalance>(r)),

  balances: (): Promise<AllBalances> =>
    fetch(`${BASE}/api/v1/balance`, { credentials: "include" })
      .then((r) => json<AllBalances>(r)),

  create: (body: TradeCreateBody): Promise<TradeCreateResp> =>
    fetch(`${BASE}/api/v1/trade/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).then((r) => json<TradeCreateResp>(r)),

  close: (orderId: string): Promise<TradeCloseResp> =>
    fetch(`${BASE}/api/v1/trade/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId }),
    }).then((r) => json<TradeCloseResp>(r)),

  klines: (asset: string, limit = 240, interval = '1m'): Promise<Kline[]> =>
    fetch(
      `${BASE}/api/v1/klines?asset=${encodeURIComponent(asset)}&interval=${interval}&limit=${limit}`,
      { credentials: "include" }
    ).then((r) => json<Kline[]>(r)),
};

export function openQuoteSSE(onMsg: (p: any) => void) {
  const es = new EventSource(`${BASE}/api/v1/stream/quotes`, { withCredentials: true });
  es.onmessage = (ev) => {
    try { onMsg(JSON.parse(ev.data)); } catch {}
  };
  return () => es.close();
}
