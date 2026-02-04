import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api, quotes } from "../lib/api";
import { DEFAULT_ASSETS } from "../lib/symbols";
export default function Instruments({ picked, onPick }) {
    const [assets, setAssets] = useState([]);
    const [bbo, setBbo] = useState({});
    const [qErr, setQErr] = useState(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { assets } = await api.supportedAssets();
                const cleaned = assets
                    .map(a => a.symbol.toUpperCase())
                    .filter(s => s === "BTC" || s === "ETH" || s === "SOL");
                const rows = cleaned.length
                    ? cleaned.map(s => ({ symbol: s, name: s === "BTC" ? "Bitcoin" : s === "ETH" ? "Ethereum" : "Solana" }))
                    : DEFAULT_ASSETS;
                if (!cancelled)
                    setAssets(rows);
            }
            catch (e) {
                if (!cancelled)
                    setAssets(DEFAULT_ASSETS);
            }
        })();
        return () => { cancelled = true; };
    }, []);
    const symbols = useMemo(() => assets.map(a => a.symbol), [assets]);
    useEffect(() => {
        if (!symbols.length)
            return;
        let timer;
        let cancelled = false;
        const poll = async () => {
            try {
                const { quotes: q } = await quotes.get(symbols);
                if (!cancelled) {
                    const next = {};
                    for (const [sym, v] of Object.entries(q))
                        next[sym] = { bid: v.bid, ask: v.ask };
                    setBbo(next);
                    setQErr(null);
                }
            }
            catch (err) {
                if (!cancelled)
                    setQErr(err?.message ?? "quotes error");
            }
        };
        poll();
        timer = setInterval(poll, 2000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [symbols]);
    return (_jsxs("div", { className: "rounded-2xl bg-[#0f1620] border border-white/5 p-4", children: [_jsx("h2", { className: "text-xl font-semibold mb-3", children: "INSTRUMENTS" }), _jsx("input", { placeholder: "Search", className: "w-full mb-4 px-4 py-3 rounded-xl bg-white/5 outline-none focus:ring-2 ring-white/10" }), _jsxs("div", { className: "grid grid-cols-3 text-white/60 text-sm px-2 pb-2", children: [_jsx("div", { children: "SYMBOL" }), _jsx("div", { className: "text-right", children: "BID" }), _jsx("div", { className: "text-right", children: "ASK" })] }), _jsxs("div", { className: "space-y-2", children: [assets.map((a) => {
                        const q = bbo[a.symbol] || { bid: 0, ask: 0 };
                        const isPicked = picked === a.symbol;
                        return (_jsxs("button", { onClick: () => onPick(a.symbol), className: `w-full flex items-center gap-3 px-3 py-3 rounded-xl border
                ${isPicked ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/5 hover:bg-white/5"}`, children: [_jsx("div", { className: "flex-1 font-medium", children: a.symbol }), _jsx("div", { className: "w-24 text-right tabular-nums", children: q.bid ? q.bid.toLocaleString() : "—" }), _jsx("div", { className: "w-24 text-right tabular-nums", children: q.ask ? q.ask.toLocaleString() : "—" })] }, a.symbol));
                    }), !assets.length && (_jsx("div", { className: "text-white/50 text-sm px-2 py-6 text-center", children: "Loading instruments\u2026" })), qErr && (_jsx("div", { className: "text-red-400/80 text-xs px-2 py-2", children: qErr }))] })] }));
}
