// api/src/engine.ts
import { prisma } from './db.js';
import { randomUUID } from 'crypto';
import { toScaledBigInt, fromScaledBigInt } from './utils/decimal.js';
import { recordPrice } from './candles.js';
import { redisSub } from './redis.js';
import { scheduleSnapshotSave } from './snapshot.js';

// ---------------- Types ----------------
export type OrderSide = 'LONG' | 'SHORT';

type PriceEntry = { price: bigint; decimal: number };
type PricesMap = Record<string, PriceEntry>;
type Bal = Record<string, bigint>;

type OpenOrder = {
  orderId: string;
  email: string;
  asset: string;
  side: OrderSide;
  margin: bigint;        // USD (2 decimals)
  leverage: number;
  entryPrice: bigint;    // scaled by asset.decimals
  assetDecimals: number;
};

export type EngineState = {
  prices: Record<string, { price: string; decimal: number }>;
  balances: Record<string, { total: string; locked: string }>;
  openOrders: Record<string, {
    orderId: string;
    email: string;
    asset: string;
    side: OrderSide;
    margin: string;
    leverage: number;
    entryPrice: string;
    assetDecimals: number;
  }>;
};

// ---------------- In-memory state ----------------
const PRICES: PricesMap = {};
const USD_BALANCE: Bal = {};
const USD_LOCKED: Bal = {};
const OPEN_ORDERS: Record<string, OpenOrder> = {};
const USD_DECIMALS = 2;

// ---------------- Price helpers ----------------
export async function initPricesFromDB() {
  const assets = await prisma.asset.findMany();
  for (const a of assets) {
    if (a.symbol === 'BTC') {
      PRICES[a.symbol] = { price: BigInt(60000 * 10 ** a.decimals), decimal: a.decimals };
    } else if (a.symbol === 'ETH') {
      PRICES[a.symbol] = { price: BigInt(2500 * 10 ** a.decimals), decimal: a.decimals };
    } else if (a.symbol === 'SOL') {
      PRICES[a.symbol] = { price: BigInt(150 * 10 ** a.decimals), decimal: a.decimals };
    } else {
      PRICES[a.symbol] = { price: BigInt(100 * 10 ** a.decimals), decimal: a.decimals };
    }
  }
}

export function setPrice(symbol: string, price: bigint, decimal: number) {
  PRICES[symbol] = { price, decimal };
}
export function getPrice(symbol: string): PriceEntry | undefined {
  return PRICES[symbol];
}

// ---- human price (dev utility) ----
export async function setHumanPrice(symbol: string, price: number | string) {
  const asset = await prisma.asset.findUnique({ where: { symbol } });
  if (!asset) throw new Error('Unsupported asset');
  const scaled = toScaledBigInt(price, asset.decimals);

  setPrice(symbol, scaled, asset.decimals);
  recordPrice(symbol, Number(price));
  scheduleSnapshotSave(); // state changed
}

export async function getHumanPrice(symbol: string) {
  const pe = getPrice(symbol);
  if (!pe) return null;
  return { symbol, price: fromScaledBigInt(pe.price, pe.decimal), decimals: pe.decimal, raw: pe.price.toString() };
}

// ---------------- Balance helpers ----------------
export function ensureUsdBalance(email: string) {
  if (!(email in USD_BALANCE)) USD_BALANCE[email] = BigInt(1_000_000); // $10,000
  if (!(email in USD_LOCKED)) USD_LOCKED[email] = 0n;
}
export function getUsdBalance(email: string) {
  ensureUsdBalance(email);
  const free = USD_BALANCE[email] - USD_LOCKED[email];
  return { free, locked: USD_LOCKED[email], total: USD_BALANCE[email] };
}

// ---------------- Open / Close trades ----------------
export async function openTrade(params: {
  email: string,
  asset: string,
  side: OrderSide,
  marginCents: bigint,
  leverage: number,
  slippageBips: number
}): Promise<{ orderId: string }> {
  ensureUsdBalance(params.email);

  if (params.marginCents <= 0n) throw new Error('Margin must be > 0');
  if (USD_BALANCE[params.email] - USD_LOCKED[params.email] < params.marginCents) {
    throw new Error('Insufficient free USD balance');
  }

  const asset = await prisma.asset.findUnique({ where: { symbol: params.asset } });
  if (!asset) throw new Error('Unsupported asset');

  const pe = getPrice(asset.symbol);
  if (!pe) throw new Error('Price unavailable');

  // lock margin
  USD_LOCKED[params.email] += params.marginCents;

  const orderId = randomUUID();
  OPEN_ORDERS[orderId] = {
    orderId,
    email: params.email,
    asset: asset.symbol,
    side: params.side,
    margin: params.marginCents,
    leverage: params.leverage,
    entryPrice: pe.price,
    assetDecimals: asset.decimals
  };

  scheduleSnapshotSave(); // state changed
  return { orderId };
}

export async function closeTrade(params: { orderId: string }) {
  const oo = OPEN_ORDERS[params.orderId];
  if (!oo) throw new Error('Order not found');

  const pe = getPrice(oo.asset);
  if (!pe) throw new Error('Price unavailable');

  const exposure = oo.margin * BigInt(oo.leverage); // USD cents
  const delta = pe.price - oo.entryPrice;            // scaled
  let pnl = (delta * exposure) / oo.entryPrice;      // USD cents
  if (oo.side === 'SHORT') pnl = -pnl;

  // release margin + apply pnl
  USD_LOCKED[oo.email] -= oo.margin;
  USD_BALANCE[oo.email] += oo.margin + pnl;

  // persist closed order
  const user = await prisma.user.findUnique({ where: { email: oo.email } });
  const asset = await prisma.asset.findUnique({ where: { symbol: oo.asset } });
  if (!user || !asset) throw new Error('Invariant failed');

  await prisma.closedOrder.create({
    data: {
      id: params.orderId,
      userId: user.id,
      assetId: asset.id,
      side: oo.side,
      margin: oo.margin,
      leverage: oo.leverage,
      entryPrice: oo.entryPrice,
      exitPrice: pe.price,
      pnl
    }
  });

  delete OPEN_ORDERS[params.orderId];
  scheduleSnapshotSave(); // state changed
  return { pnl };
}

// ----------- State snapshot (serialize BigInt as string) -------------
export function dumpState(): EngineState {
  const prices: EngineState['prices'] = {};
  for (const [sym, p] of Object.entries(PRICES)) {
    prices[sym] = { price: p.price.toString(), decimal: p.decimal };
  }

  const balances: EngineState['balances'] = {};
  for (const [email, total] of Object.entries(USD_BALANCE)) {
    const locked = USD_LOCKED[email] ?? 0n;
    balances[email] = { total: total.toString(), locked: locked.toString() };
  }

  const openOrders: EngineState['openOrders'] = {};
  for (const [id, o] of Object.entries(OPEN_ORDERS)) {
    openOrders[id] = {
      orderId: o.orderId,
      email: o.email,
      asset: o.asset,
      side: o.side,
      margin: o.margin.toString(),
      leverage: o.leverage,
      entryPrice: o.entryPrice.toString(),
      assetDecimals: o.assetDecimals
    };
  }

  return { prices, balances, openOrders };
}

export function restoreState(state: EngineState) {
  // prices
  for (const [sym, p] of Object.entries(state.prices || {})) {
    setPrice(sym, BigInt(p.price), p.decimal);
  }

  // balances
  for (const [email, b] of Object.entries(state.balances || {})) {
    USD_BALANCE[email] = BigInt(b.total);
    USD_LOCKED[email] = BigInt(b.locked);
  }

  // open orders
  for (const [id, o] of Object.entries(state.openOrders || {})) {
    OPEN_ORDERS[id] = {
      orderId: o.orderId,
      email: o.email,
      asset: o.asset,
      side: o.side,
      margin: BigInt(o.margin),
      leverage: o.leverage,
      entryPrice: BigInt(o.entryPrice),
      assetDecimals: o.assetDecimals
    };
  }
}



// List open orders for a user (DTO for API)
export function listOpenOrdersByEmail(email: string) {
  const rows = Object.values(OPEN_ORDERS).filter(o => o.email === email);
  return rows.map(o => ({
    orderId: o.orderId,
    asset: o.asset,
    side: o.side,
    marginCents: o.margin.toString(),     // string to avoid bigint issues
    leverage: o.leverage,
    entryPrice: o.entryPrice.toString(),  // scaled
    assetDecimals: o.assetDecimals
  }));
}


// ----------- Redis subscriber (prices channel) -------------
export async function startPriceSubscriber(channel = 'prices') {
  await redisSub.subscribe(channel);
  console.log(`📡 Subscribed to Redis channel: ${channel}`);

  redisSub.on('message', async (_ch, msg) => {
    try {
      const data = JSON.parse(msg);
      const arr = Array.isArray(data) ? data
               : Array.isArray(data?.price_updates) ? data.price_updates
               : [];

      let touched = false;

      for (const u of arr) {
        if (!u?.asset || u?.price == null || u?.decimal == null) continue;
        const asset = String(u.asset);
        const price = BigInt(u.price);
        const dec = Number(u.decimal);

        setPrice(asset, price, dec);
        const human = Number(price) / 10 ** dec;
        recordPrice(asset, human);
        touched = true;
      }

      if (touched) scheduleSnapshotSave(); // state changed
    } catch (e) {
      console.error('price msg parse error:', e);
    }
  });
}
