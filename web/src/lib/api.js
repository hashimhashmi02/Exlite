const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
async function json(res) {
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error)
                msg = body.error;
        }
        catch { }
        throw new Error(msg);
    }
    return res.json();
}
export const api = {
    me: () => fetch(`${BASE}/api/v1/me`, { credentials: "include" }).then((r) => json(r)),
    signin: (email) => fetch(`${BASE}/api/v1/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
    }).then((r) => json(r)),
    exchangeMagic: (token) => fetch(`${BASE}/api/v1/magic/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
    }).then((r) => json(r)),
    logout: () => fetch(`${BASE}/api/v1/logout`, {
        method: "POST",
        credentials: "include",
    }).then((r) => json(r)),
    supportedAssets: () => fetch(`${BASE}/api/v1/supportedAssets`, { credentials: "include" })
        .then((r) => json(r)),
};
export const quotes = {
    get: (assets) => fetch(`${BASE}/api/v1/quotes?assets=${encodeURIComponent(assets.join(","))}`, { credentials: "include" }).then((r) => json(r)),
};
export const orders = {
    open: () => fetch(`${BASE}/api/v1/openOrders`, { credentials: "include" })
        .then((r) => json(r)),
    closed: () => fetch(`${BASE}/api/v1/closedOrders`, { credentials: "include" })
        .then((r) => json(r)),
};
export const trading = {
    price: (asset) => fetch(`${BASE}/api/v1/price?asset=${encodeURIComponent(asset)}`, {
        credentials: "include",
    }).then((r) => json(r)),
    balanceUsd: () => fetch(`${BASE}/api/v1/balance/usd`, { credentials: "include" })
        .then((r) => json(r)),
    balances: () => fetch(`${BASE}/api/v1/balance`, { credentials: "include" })
        .then((r) => json(r)),
    create: (body) => fetch(`${BASE}/api/v1/trade/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    }).then((r) => json(r)),
    close: (orderId) => fetch(`${BASE}/api/v1/trade/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
    }).then((r) => json(r)),
    klines: (asset, limit = 240, interval = '1m') => fetch(`${BASE}/api/v1/klines?asset=${encodeURIComponent(asset)}&interval=${interval}&limit=${limit}`, { credentials: "include" }).then((r) => json(r)),
};
export function openQuoteSSE(onMsg) {
    const es = new EventSource(`${BASE}/api/v1/stream/quotes`, { withCredentials: true });
    es.onmessage = (ev) => {
        try {
            onMsg(JSON.parse(ev.data));
        }
        catch { }
    };
    return () => es.close();
}
