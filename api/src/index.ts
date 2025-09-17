import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { env } from "./env.js";
import { requireAuth } from "./middleware.js";
import {
  createMagicToken,
  createSessionToken,
  verifyMagicToken,
  verifySessionToken,
} from "./auth.js";

import * as engine from "./engine.js";
import * as marketFeed from "./marketFeed.js";

import { initMailer, sendMagicLink } from "./mailer.js";

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


const cents = (n: number) => Math.round(Number(n) * 100);
const toRawPx = (px: number, decimals: number) =>
  String(Math.round(Number(px) * 10 ** decimals));
const getDecimals = (sym: Sym) =>
  Number(engine.getQuotes()[sym]?.decimals ?? 2);

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: env.NODE_ENV !== "development",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
    console.warn("Market feed not started:", (e as Error)?.message || e);
  }
})();

(async () => {
  try {
    await initMailer();
  } catch (e) {
    console.warn("⚠️  Mailer not initialised:", (e as Error).message);
  }
})();


app.post("/api/v1/signin", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  const token = createMagicToken(email);
  const magicUrl = `${env.FRONTEND_URL}/magic?token=${encodeURIComponent(
    token
  )}`;

  try {
    await sendMagicLink(email, magicUrl);
    if (env.NODE_ENV === "development") {
      console.log("Magic URL:", magicUrl);
    }
    return res.json({
      ok: true,
      email,
      magicUrl: env.NODE_ENV === "development" ? magicUrl : undefined,
    });
  } catch (e) {
    console.warn("sendMagicLink failed:", (e as Error).message);

    return res.json({
      ok: true,
      email,
      magicUrl: env.NODE_ENV === "development" ? magicUrl : undefined,
    });
  }
});


app.post("/api/v1/magic/exchange", (req, res) => {
  const token = String(req.body?.token || "");
  if (!token) return res.status(400).json({ ok: false, error: "Missing token" });

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


app.get("/api/v1/supportedAssets", (_req, res) => {
  res.json({
    assets: [
      { symbol: "BTC", name: "Bitcoin", imageUrl: "" },
      { symbol: "ETH", name: "Ethereum", imageUrl: "" },
      { symbol: "SOL", name: "Solana", imageUrl: "" },
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
  const email = (req as any).userEmail as string;
  const b = engine.getUsdBalance(email);
  res.json({ balance: Number(b.cash ?? 0) });
});

app.get("/api/v1/balance", requireAuth, (req, res) => {
  const email = (req as any).userEmail as string;
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
  const email = (req as any).userEmail as string;
  const raw = engine.listOpenOrders(email) || [];
  res.json({ orders: raw.map(mapOpen) });
});

app.get("/api/v1/closedOrders", requireAuth, (req, res) => {
  const email = (req as any).userEmail as string;
  const raw = engine.listClosedOrders(email) || [];
  res.json({ orders: raw.map(mapClosed) });
});



app.post("/api/v1/trade/create", requireAuth, (req, res) => {
  try {
    const email = (req as any).userEmail as string;
    const { asset, type, margin, leverage } = req.body || {};
    const symbol = String(asset || "BTC").toUpperCase() as Sym;
    const side = String(type || "long").toUpperCase() === "SHORT" ? "SHORT" : "LONG";

    const order = engine.openTrade(email, {
      symbol,
      side,
      margin: Number(margin),
      leverage: Number(leverage || 1),
    });

    res.json({ orderId: String(order.id) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post("/api/v1/trade/close", requireAuth, (req, res) => {
  try {
    const email = (req as any).userEmail as string;
    const orderId = String(req.body?.orderId ?? req.body?.id ?? "").trim();
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const closed = engine.closeTrade(email, orderId);
    res.json({
      orderId: String(closed.id),
      pnl: String(closed.pnl ?? 0),
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post("/api/v1/closeTrade", requireAuth, (req, res) => {
  try {
    const email = (req as any).userEmail as string;
    const orderId = String(req.body?.orderId ?? req.body?.id ?? "").trim();
    if (!orderId) return res.status(400).json({ ok: false, error: "orderId required" });

    const closed = engine.closeTrade(email, orderId);
    res.json({ ok: true, orderId: String(closed.id), pnl: String(closed.pnl ?? 0) });
  } catch (e) {
    res.status(400).json({ ok: false, error: (e as Error).message });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
});
