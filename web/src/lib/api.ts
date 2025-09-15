export type Me = { authenticated: boolean; email?: string };
export type Asset = { symbol: string; name: string; imageUrl: string };
export type Quote = { symbol:string; bid:number; ask:number; mid:number; decimals:number };

const BASE = import.meta.env.VITE_API_URL || '';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: (): Promise<Me> =>
    fetch(`${BASE}/api/v1/me`, { credentials: 'include' })
      .then((res) => j<Me>(res)),

  signin: (email: string): Promise<{ ok: true }> =>
    fetch(`${BASE}/api/v1/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    }).then((res) => j<{ ok: true }>(res)),

  supportedAssets: (): Promise<{ assets: Asset[] }> =>
    fetch(`${BASE}/api/v1/supportedAssets`, { credentials: 'include' })
      .then((res) => j<{ assets: Asset[] }>(res)),
};

export type UsdBalance = { balance: number }; 
export type AllBalances = Record<string, { balance: number; decimals: number }>;
export type PriceResp = { symbol: string; price: string; decimals: number; raw: string };

export type TradeCreateBody = {
  asset: string;            
  type: 'long' | 'short';
  margin: number;           
  leverage: number;        
  slippage: number;         
};
export type TradeCreateResp = { orderId: string };
export type TradeCloseResp = { orderId: string; pnl: string }; // cents-as-string



export const quotes = {
  get: (assets: string[]): Promise<{ quotes: Record<string, Quote>, spreadBips:number }> =>
    fetch(`${BASE}/api/v1/quotes?assets=${encodeURIComponent(assets.join(','))}`, { credentials:'include' })
      .then(res => j<{ quotes: Record<string, Quote>, spreadBips:number }>(res)),
};

export type OpenOrderDTO = {
  orderId: string; asset: string; side: 'LONG'|'SHORT';
  marginCents: string; leverage: number;
  entryPrice: string; assetDecimals: number;
};
export const orders = {
  open: (): Promise<{ orders: OpenOrderDTO[] }> =>
    fetch(`${BASE}/api/v1/openOrders`, { credentials:'include' })
      .then(res => j<{ orders: OpenOrderDTO[] }>(res)),
  closed: (): Promise<{ orders: any[] }> =>
    fetch(`${BASE}/api/v1/closedOrders`, { credentials:'include' })
      .then(res => j<{ orders: any[] }>(res)),
};








export const trading = {
  price: (asset: string): Promise<PriceResp> =>
    fetch(`${BASE}/api/v1/price?asset=${encodeURIComponent(asset)}`, {
      credentials: 'include',
    }).then((res) => j<PriceResp>(res)),

  balanceUsd: (): Promise<UsdBalance> =>
    fetch(`${BASE}/api/v1/balance/usd`, { credentials: 'include' })
      .then((res) => j<UsdBalance>(res)),

  balances: (): Promise<AllBalances> =>
    fetch(`${BASE}/api/v1/balance`, { credentials: 'include' })
      .then((res) => j<AllBalances>(res)),

  create: (body: TradeCreateBody): Promise<TradeCreateResp> =>
    fetch(`${BASE}/api/v1/trade/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then((res) => j<TradeCreateResp>(res)),

  close: (orderId: string): Promise<TradeCloseResp> =>
    fetch(`${BASE}/api/v1/trade/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderId }),
    }).then((res) => j<TradeCloseResp>(res)),

  klines: (asset: string, limit = 60): Promise<[number, number, number, number, number, number][]> =>
    fetch(`${BASE}/api/v1/klines?asset=${encodeURIComponent(asset)}&interval=1m&limit=${limit}`, {
      credentials: 'include',
    }).then((res) => j(res)),
};
