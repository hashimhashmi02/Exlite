import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { orders } from "../lib/api";
const usd = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export default function ClosedOrders() {
    const [rows, setRows] = useState([]);
    useEffect(() => { (async () => { try {
        const { orders: os } = await orders.closed();
        setRows(os);
    }
    catch { } })(); }, []);
    return (_jsxs("div", { className: "mt-4", children: [_jsx("h3", { className: "text-sm uppercase tracking-wider text-white/60 mb-2", children: "Closed" }), _jsx("div", { className: "rounded-xl border border-white/10 overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-white/10 text-white/70", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Symbol" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Side" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Margin" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Entry" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Exit" }), _jsx("th", { className: "px-3 py-2 text-right", children: "P/L" })] }) }), _jsxs("tbody", { children: [rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-3 py-4 text-white/60", children: "No history yet." }) })), rows.map((r) => (_jsxs("tr", { className: "border-t border-white/10", children: [_jsx("td", { className: "px-3 py-2 font-medium", children: r.asset }), _jsx("td", { className: "px-3 py-2", children: r.side }), _jsx("td", { className: "px-3 py-2 text-right", children: usd(Number(r.marginCents) / 100) }), _jsx("td", { className: "px-3 py-2 text-right", children: (Number(r.entryPrice) / 10 ** r.assetDecimals).toLocaleString() }), _jsx("td", { className: "px-3 py-2 text-right", children: (Number(r.exitPrice) / 10 ** r.assetDecimals).toLocaleString() }), _jsx("td", { className: `px-3 py-2 text-right ${Number(r.pnlCents) >= 0 ? 'text-green-400' : 'text-red-400'}`, children: usd(Number(r.pnlCents) / 100) })] }, r.orderId)))] })] }) })] }));
}
