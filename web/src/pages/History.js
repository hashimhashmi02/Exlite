import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { orders } from "../lib/api";
const usd = (n) => n == null || !Number.isFinite(n) ? "$0.00" :
    `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export default function History() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    async function load() {
        setLoading(true);
        try {
            const r = await orders.closed();
            setRows(r.orders ?? []);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);
    return (_jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Closed Orders" }), _jsx("div", { className: "rounded-xl border border-white/10 overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-white/10 text-white/70", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Order" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Asset" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Side" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Margin" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Leverage" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Entry" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Exit" }), _jsx("th", { className: "px-3 py-2 text-right", children: "P/L" })] }) }), _jsxs("tbody", { children: [rows.length === 0 && !loading && (_jsx("tr", { children: _jsx("td", { className: "px-3 py-4 text-white/60", colSpan: 8, children: "No history." }) })), rows.map((r) => {
                                    const dec = Number(r.assetDecimals ?? 2);
                                    const margin = Number(r.marginCents ?? 0) / 100;
                                    const entry = r.entryPrice ? Number(r.entryPrice) / 10 ** dec : undefined;
                                    const exit = r.exitPrice ? Number(r.exitPrice) / 10 ** dec : undefined;
                                    const pnl = r.pnlCents ? Number(r.pnlCents) / 100 : undefined;
                                    return (_jsxs("tr", { className: "border-t border-white/10", children: [_jsx("td", { className: "px-3 py-2", children: r.orderId }), _jsx("td", { className: "px-3 py-2", children: r.asset }), _jsx("td", { className: "px-3 py-2", children: r.side }), _jsx("td", { className: "px-3 py-2 text-right", children: usd(margin) }), _jsxs("td", { className: "px-3 py-2 text-right", children: [r.leverage, "x"] }), _jsx("td", { className: "px-3 py-2 text-right", children: entry?.toLocaleString() ?? "—" }), _jsx("td", { className: "px-3 py-2 text-right", children: exit?.toLocaleString() ?? "—" }), _jsx("td", { className: `px-3 py-2 text-right ${(pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`, children: usd(pnl) })] }, r.orderId));
                                })] })] }) })] }));
}
