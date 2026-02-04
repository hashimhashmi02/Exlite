import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./env.js";
import { requireAuth, getUserEmail } from "./middleware.js";
import {
  createMagicToken,
  createSessionToken,
  verifyMagicToken,
  verifySessionToken,
} from "./auth.js";

import * as engine from "./engine.js";
import * as marketFeed from "./marketFeed.js";

import { initMailer, sendMagicLink } from "./mailer.js";
import { log } from "./logger.js";
import { 
  validate, 
  SigninSchema, 
  MagicExchangeSchema, 
  TradeCreateSchema, 
  TradeCloseSchema,
  SESSION_MAX_AGE_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_SIGNIN_MAX,
  RATE_LIMIT_MAGIC_MAX,
  DEFAULT_DECIMALS
} from "./types.js";

type Sym = engine.AssetSym;


const app = express();
const PORT = Number(process.env.PORT || env.PORT || 8080);

app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_SIGNIN_MAX,
  message: { ok: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const magicLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAGIC_MAX,
  message: { ok: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const cents = (n: number) => Math.round(Number(n) * 100);
const toRawPx = (px: number, decimals: number) =>
  String(Math.round(Number(px) * 10 ** decimals));
const getDecimals = (sym: Sym) =>
  Number(engine.getQuotes()[sym]?.decimals ?? DEFAULT_DECIMALS);

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: env.NODE_ENV !== "development",
  maxAge: SESSION_MAX_AGE_MS,
};


(async () => {
  try {
    if (typeof (marketFeed as any).initPricesFromDB === "function") {
      await (marketFeed as any).initPricesFromDB();
    }
    const start =
      (marketFeed as any).startPriceSubscriber ??
      (marketFeed as any).startPricesSubscriber;

    if (typeof start === "function") {
      await start((sym: Sym, price: number) => {
        try {
          engine.setQuote(sym, price, 2);
        } catch {}
      });
    }
  } catch (e) {
    log.warn("Market feed not started", { error: (e as Error)?.message || e });
  }
})();

(async () => {
  try {
    await initMailer();
  } catch (e) {
    log.warn("Mailer not initialised", { error: (e as Error).message });
  }
})();


app.post("/api/v1/signin", authLimiter, validate(SigninSchema), async (req, res) => {
  const { email } = req.body;

  const token = createMagicToken(email);
  const magicUrl = `${env.FRONTEND_URL}/magic?token=${encodeURIComponent(
    token
  )}`;

  try {
    await sendMagicLink(email, magicUrl);
    if (env.NODE_ENV === "development") {
      log.debug("Magic URL generated", { magicUrl });
    }
    return res.json({
      ok: true,
      email,
      magicUrl: env.NODE_ENV === "development" ? magicUrl : undefined,
    });
  } catch (e) {
    log.warn("sendMagicLink failed", { error: (e as Error).message });

    return res.json({
      ok: true,
      email,
      magicUrl: env.NODE_ENV === "development" ? magicUrl : undefined,
    });
  }
});


app.post("/api/v1/magic/exchange", magicLimiter, validate(MagicExchangeSchema), (req, res) => {
  const { token } = req.body;

  try {
    const { email } = verifyMagicToken(token);
    const session = createSessionToken(email);
    res.cookie("session", session, cookieOpts);
    return res.json({ ok: true, email });
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid token" });
  }
});


app.get("/api/v1/magic", (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).send("Missing token");

  try {
    const { email } = verifyMagicToken(token);
    const session = createSessionToken(email);
    res.cookie("session", session, cookieOpts);
    return res.redirect(`${env.FRONTEND_URL}/trade`);
  } catch {
    return res.status(400).send("Invalid or expired link");
  }
});


app.get("/api/v1/me", (req, res) => {
  const token = req.cookies?.session as string | undefined;
  if (!token) return res.json({ authenticated: false });
  try {
    const { email } = verifySessionToken(token);
    return res.json({ authenticated: true, email });
  } catch {
    return res.json({ authenticated: false });
  }
});

// Logout endpoint - clears the session cookie
app.post("/api/v1/logout", (_req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV !== "development",
  });
  return res.json({ ok: true });
});

app.get("/api/v1/supportedAssets", (_req, res) => {
  res.json({
    assets: [
      { symbol: "BTC", name: "Bitcoin", imageUrl: "" },
      { symbol: "ETH", name: "Ethereum", imageUrl: "" },
      { symbol: "SOL", name: "Solana", imageUrl: "" },
      { symbol: "XRP", name: "Ripple", imageUrl: "" },
      { symbol: "DOGE", name: "Dogecoin", imageUrl: "" },
      { symbol: "ADA", name: "Cardano", imageUrl: "" },
      { symbol: "AVAX", name: "Avalanche", imageUrl: "" },
      { symbol: "MATIC", name: "Polygon", imageUrl: "" },
      { symbol: "LINK", name: "Chainlink", imageUrl: "" },
    ],
  });
});

app.get("/api/v1/price", requireAuth, (req, res) => {
  const asset = String(req.query.asset || "BTC").toUpperCase() as Sym;
  const price = Number(engine.getQuote(asset));
  res.json({
    symbol: asset,
    price: price.toFixed(4),
    decimals: 4,
    raw: Math.round(price * 10_000).toString(),
  });
});

app.get("/api/v1/quotes", requireAuth, (_req, res) => {
  const mf =
    typeof (marketFeed as any).getQuotes === "function"
      ? (marketFeed as any).getQuotes()
      : null;

  const build = (sym: Sym) => {
    if (mf?.[sym]) {
      const q = mf[sym];
      const mid = Number(q.mid ?? q.price ?? 0);
      return {
        symbol: sym,
        bid: Number(q.bid ?? mid),
        ask: Number(q.ask ?? mid),
        mid,
        decimals: Number(q.decimals ?? 2),
      };
    }
    const p = engine.getQuotes()[sym];
    const mid = Number(p?.price ?? 0);
    const d = Number(p?.decimals ?? 2);
 
    return { symbol: sym, bid: mid * 0.999, ask: mid * 1.001, mid, decimals: d };
  };

  res.json({
    quotes: {
      BTC: build("BTC"),
      ETH: build("ETH"),
      SOL: build("SOL"),
      XRP: build("XRP"),
      DOGE: build("DOGE"),
      ADA: build("ADA"),
      AVAX: build("AVAX"),
      MATIC: build("MATIC"),
      LINK: build("LINK"),
    },
    spreadBips: 0,
  });
});

app.get("/api/v1/klines", requireAuth, async (req, res) => {
  try {
    if (typeof (marketFeed as any).getKlines !== "function") return res.json([]);
    const asset = String(req.query.asset || "BTC");
    const interval = String(req.query.interval || "1m");
    const limit = Number(req.query.limit || 240);
    const rows = await (marketFeed as any).getKlines(asset, interval, limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/v1/balance/usd", requireAuth, (req, res) => {
  const email = getUserEmail(req);
  const b = engine.getUsdBalance(email);
  res.json({ balance: Number(b.cash ?? 0) });
});

app.get("/api/v1/balance", requireAuth, (req, res) => {
  const email = getUserEmail(req);
  const b = engine.getUsdBalance(email);
  res.json({
    USD: { balance: Number(b.cash ?? 0), decimals: 2 },
  });
});

type OpenOrderDTO = {
  orderId: string;
  asset: string;
  side: "LONG" | "SHORT";
  marginCents: string;
  leverage: number;
  entryPrice?: string;
  assetDecimals: number;
};

const mapOpen = (o: engine.OpenOrder): OpenOrderDTO => {
  const sym = String(o.symbol).toUpperCase() as Sym;
  const dec = getDecimals(sym);
  return {
    orderId: String((o as any).orderId || o.id),
    asset: sym,
    side: o.side,
    marginCents: String(cents(o.margin)),
    leverage: Number(o.leverage),
    entryPrice: toRawPx(o.entry, dec),
    assetDecimals: dec,
  };
};

const mapClosed = (o: engine.ClosedOrder) => {
  const sym = String(o.symbol).toUpperCase() as Sym;
  const dec = getDecimals(sym);
  return {
    orderId: String((o as any).orderId || o.id),
    asset: sym,
    side: o.side,
    marginCents: String(cents(o.margin)),
    leverage: Number(o.leverage),
    entryPrice: toRawPx(o.entry, dec),
    exitPrice: toRawPx(o.exit, dec),
    pnlCents: String(cents(o.pnl)),
    assetDecimals: dec,
    closedAt: o.closedAt,
  };
};



app.get("/api/v1/openOrders", requireAuth, (req, res) => {
  const email = getUserEmail(req);
  const raw = engine.listOpenOrders(email) || [];
  res.json({ orders: raw.map(mapOpen) });
});

app.get("/api/v1/closedOrders", requireAuth, (req, res) => {
  const email = getUserEmail(req);
  const raw = engine.listClosedOrders(email) || [];
  res.json({ orders: raw.map(mapClosed) });
});



app.post("/api/v1/trade/create", requireAuth, validate(TradeCreateSchema), (req, res) => {
  try {
    const email = getUserEmail(req);
    const { asset, type, margin, leverage } = req.body;
    const symbol = asset.toUpperCase() as Sym;
    const side = type.toUpperCase() === "SHORT" ? "SHORT" : "LONG";

    const order = engine.openTrade(email, {
      symbol,
      side,
      margin,
      leverage,
    });

    res.json({ orderId: String(order.id) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post("/api/v1/trade/close", requireAuth, validate(TradeCloseSchema), (req, res) => {
  try {
    const email = getUserEmail(req);
    const { orderId } = req.body;

    const closed = engine.closeTrade(email, orderId);
    res.json({
      ok: true,
      orderId: String(closed.id),
      pnl: String(closed.pnl ?? 0),
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: (e as Error).message });
  }
});


app.listen(PORT, () => {
  log.info(`API listening on http://localhost:${PORT}`);
});
