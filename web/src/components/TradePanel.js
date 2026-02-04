import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { trading } from "../lib/api";
import OpenOrders from "./OpenOrders";
export default function TradePanel({ asset }) {
    const [side, setSide] = useState("long");
    const [margin, setMargin] = useState(50000); // cents
    const [leverage, setLev] = useState(10);
    const [price, setPrice] = useState("—");
    const [orderId, setOrderId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    useEffect(() => {
        let stop = false;
        const tick = async () => {
            if (asset) {
                try {
                    const r = await trading.price(asset);
                    setPrice(r.price);
                }
                catch {
                    setPrice("—");
                }
            }
            else
                setPrice("—");
            if (!stop)
                setTimeout(tick, 2000);
        };
        tick();
        return () => { stop = true; };
    }, [asset]);
    const disabled = useMemo(() => !asset || busy, [asset, busy]);
    async function openTrade() {
        if (!asset)
            return;
        setBusy(true);
        setErr(null);
        setOrderId(null);
        try {
            const out = await trading.create({ asset, type: side, margin, leverage, slippage: 100 });
            setOrderId(out.orderId);
        }
        catch (e) {
            setErr(e?.message || "Failed");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("div", { className: "h-full flex flex-col", children: [_jsxs("div", { className: "px-4 py-2 border-b border-white/10 flex items-center justify-between", children: [_jsx("div", { className: "font-medium", children: "Order" }), _jsx("div", { className: "text-xs text-white/60", children: "Market \u25BE" })] }), _jsxs("div", { className: "p-4 overflow-auto", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-black/20 p-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-4 items-center", children: [_jsx("div", { className: "text-sm text-white/60", children: "Selected" }), _jsx("div", { className: "text-lg font-semibold col-span-1", children: asset ?? "—" }), _jsx("div", { className: "text-sm text-white/60", children: "Price" }), _jsxs("div", { className: "text-lg font-semibold", children: ["$", price] })] }), _jsxs("div", { className: "mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: [_jsxs("div", { className: "bg-black/30 rounded-xl p-3", children: [_jsx("div", { className: "text-xs text-white/60 mb-2", children: "Side" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: `flex-1 rounded-lg px-3 py-2 text-sm ${side === 'long' ? 'bg-green-500/90 text-black' : 'bg-white text-black/90'}`, onClick: () => setSide('long'), children: "Long" }), _jsx("button", { className: `flex-1 rounded-lg px-3 py-2 text-sm ${side === 'short' ? 'bg-red-500/90 text-black' : 'bg-white text-black/90'}`, onClick: () => setSide('short'), children: "Short" })] })] }), _jsxs("div", { className: "bg-black/30 rounded-xl p-3", children: [_jsx("div", { className: "text-xs text-white/60 mb-2", children: "Margin (USD)" }), _jsx("input", { type: "number", min: 10, className: "w-full rounded-lg bg-white text-black px-3 py-2 outline-none placeholder:text-black/60", value: Math.round(margin / 100), onChange: (e) => setMargin(Math.max(10, Number(e.target.value || 0)) * 100) })] }), _jsxs("div", { className: "bg-black/30 rounded-xl p-3", children: [_jsx("div", { className: "text-xs text-white/60 mb-2", children: "Leverage" }), _jsx("select", { className: "w-full rounded-lg bg-white text-black px-3 py-2 outline-none", value: leverage, onChange: (e) => setLev(Number(e.target.value)), children: [1, 2, 3, 5, 10, 20, 25, 50, 100].map(n => _jsxs("option", { value: n, children: [n, "x"] }, n)) })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3", children: [_jsx("button", { disabled: disabled, onClick: openTrade, className: "rounded-xl px-4 py-2 bg-yellow-400 text-black font-semibold disabled:opacity-60", children: busy ? "Placing…" : "Open Trade" }), orderId && _jsxs("div", { className: "text-sm text-white/80", children: ["Order ID: ", _jsx("span", { className: "font-mono", children: orderId })] }), err && _jsx("div", { className: "text-sm text-red-400", children: err })] })] }), _jsx(OpenOrders, {})] })] }));
}
