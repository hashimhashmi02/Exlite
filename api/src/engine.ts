import { DEFAULT_USER_BALANCE } from './types.js';

export type AssetSym = "BTC" | "ETH" | "SOL" | "XRP" | "DOGE" | "ADA" | "AVAX" | "MATIC" | "LINK";
type Quote = { price: number; decimals: number };
const QUOTES: Record<AssetSym, Quote> = {
  BTC: { price: 110000, decimals: 2 },
  ETH: { price: 3500, decimals: 2 },
  SOL: { price: 150, decimals: 2 },
  XRP: { price: 0.50, decimals: 4 },
  DOGE: { price: 0.10, decimals: 5 },
  ADA: { price: 0.40, decimals: 4 },
  AVAX: { price: 30, decimals: 2 },
  MATIC: { price: 0.60, decimals: 4 },
  LINK: { price: 15, decimals: 2 },
};
export type Side = "LONG" | "SHORT";

export type OpenOrder = {
  orderId: string;
  id: string;
  email: string;
  symbol: AssetSym;
  side: Side;
  margin: number;      
  leverage: number;   
  entry: number;       
  openedAt: number;    
};

export type ClosedOrder = OpenOrder & {
  exit: number;
  pnl: number;
  closedAt: number;
};

type Quotes = Record<AssetSym, number>;

const balances = new Map<string, number>();          
const openByUser = new Map<string, OpenOrder[]>();  
const closedByUser = new Map<string, ClosedOrder[]>();
const quotes: Quotes = { 
  BTC: 113000, 
  ETH: 4500, 
  SOL: 250,
  XRP: 0.50,
  DOGE: 0.10,
  ADA: 0.40,
  AVAX: 30,
  MATIC: 0.60,
  LINK: 15
};


function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ensureUser(email: string) {
  if (!balances.has(email)) balances.set(email, DEFAULT_USER_BALANCE);
  if (!openByUser.has(email)) openByUser.set(email, []);
  if (!closedByUser.has(email)) closedByUser.set(email, []);
}

function qtyFrom(order: OpenOrder): number {
 
  return (order.margin * order.leverage) / order.entry;
}

export function setQuote(sym: AssetSym, price: number, decimals = 2): void {
  QUOTES[sym] = { price, decimals };
}

export function getQuote(sym: AssetSym): number {
  return QUOTES[sym]?.price ?? 0;
}

export function getQuotes(): Record<AssetSym, Quote> {
  return QUOTES;
}

export function getUsdBalance(email: string) {
  ensureUser(email);
  const cash = balances.get(email)!;

  const open = listOpenOrders(email);
  const marginUsed = open.reduce((s, o) => s + o.margin, 0);


  const upnl = open.reduce((s, o) => {
    const px = getQuote(o.symbol);
    const qty = qtyFrom(o);
    const diff = o.side === "LONG" ? (px - o.entry) : (o.entry - px);
    return s + diff * qty;
  }, 0);

  const equity = cash + upnl;
  const free = cash; 

  return { cash, equity, marginUsed, free, usd: cash };
}

export function listOpenOrders(email: string): OpenOrder[] {
  ensureUser(email);
  return [...openByUser.get(email)!];
}

export function listClosedOrders(email: string): ClosedOrder[] {
  ensureUser(email);
  return [...closedByUser.get(email)!].sort((a, b) => b.closedAt - a.closedAt);
}

export function openTrade(
  email: string,
  params: { symbol: AssetSym; side: Side; margin: number; leverage: number }
): OpenOrder {
  ensureUser(email);

  const price = getQuote(params.symbol);
  if (!Number.isFinite(price) || price <= 0) throw new Error("No price");

  const cash = balances.get(email)!;
  if (params.margin <= 0) throw new Error("Invalid margin");
  if (params.leverage < 1 || params.leverage > 100) throw new Error("Invalid leverage");
  if (cash < params.margin) throw new Error("Insufficient balance");

  balances.set(email, cash - params.margin);

  const order: OpenOrder = {
    id: uid(),
    email,
    symbol: params.symbol,
    side: params.side,
    margin: Number(params.margin),
    leverage: Number(params.leverage),
    entry: price,
    openedAt: Date.now(),
    orderId: ""
  };

  openByUser.get(email)!.push(order);
  return order;
}

export function closeTrade(email: string, orderId: string): ClosedOrder {
  ensureUser(email);
  const arr = openByUser.get(email)!;
  const idx = arr.findIndex(o => o.id === orderId);
  if (idx === -1) throw new Error("Order not found");

  const o = arr[idx];
  const exit = getQuote(o.symbol);
  const qty = qtyFrom(o);
  const diff = o.side === "LONG" ? (exit - o.entry) : (o.entry - exit);
  const pnl = diff * qty;


  const cash = balances.get(email)!;
  balances.set(email, cash + o.margin + pnl);

  const closed: ClosedOrder = {
    ...o,
    exit,
    pnl,
    closedAt: Date.now(),
  };

  arr.splice(idx, 1);
  closedByUser.get(email)!.push(closed);
  return closed;
}

// ==================== State Persistence ====================

export type EngineState = {
  balances: Record<string, number>;
  openOrders: Record<string, OpenOrder[]>;
  closedOrders: Record<string, ClosedOrder[]>;
};

export function dumpState(): EngineState {
  return {
    balances: Object.fromEntries(balances),
    openOrders: Object.fromEntries(openByUser),
    closedOrders: Object.fromEntries(closedByUser),
  };
}

export function restoreState(state: EngineState): void {
  balances.clear();
  openByUser.clear();
  closedByUser.clear();

  for (const [email, bal] of Object.entries(state.balances || {})) {
    balances.set(email, bal);
  }
  for (const [email, orders] of Object.entries(state.openOrders || {})) {
    openByUser.set(email, orders);
  }
  for (const [email, orders] of Object.entries(state.closedOrders || {})) {
    closedByUser.set(email, orders);
  }
}
