import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { orders, trading } from "../lib/api";
const usd = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export default function OpenOrdersTable() {
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState(null);
    async function load() {
        setErr(null);
        try {
            const { orders: os } = await orders.open();
            setRows(os ?? []);
        }
        catch (e) {
            setErr(e?.message || "Failed to load open orders");
        }
    }
    useEffect(() => {
        load();
        const t = setInterval(load, 2000);
        return () => clearInterval(t);
    }, []);
    async function closeOrder(id) {
        setErr(null);
        try {
            await trading.close(id);
            await load();
        }
        catch (e) {
            setErr(e?.message || "Failed to close");
        }
    }
    return (_jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "text-sm uppercase tracking-wider text-white/60 mb-2", children: "Open" }), _jsx("div", { className: "rounded-xl border border-white/10 overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-white/10 text-white/70", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Symbol" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Side" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Margin" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Leverage" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Entry" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Action" })] }) }), _jsxs("tbody", { children: [rows.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "px-3 py-4 text-white/60", colSpan: 6, children: "No open orders." }) })), rows.map((r) => {
                                    const dec = Number(r.assetDecimals ?? 2);
                                    const entry = r.entryPrice
                                        ? Number(r.entryPrice) / 10 ** dec
                                        : undefined;
                                    const margin = Number(r.marginCents ?? "0") / 100;
                                    return (_jsxs("tr", { className: "border-t border-white/10", children: [_jsx("td", { className: "px-3 py-2 font-medium", children: r.asset }), _jsx("td", { className: "px-3 py-2", children: r.side }), _jsx("td", { className: "px-3 py-2 text-right", children: usd(margin) }), _jsxs("td", { className: "px-3 py-2 text-right", children: [r.leverage, "x"] }), _jsx("td", { className: "px-3 py-2 text-right", children: entry?.toLocaleString() ?? "—" }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx("button", { onClick: () => closeOrder(r.orderId), className: "px-3 py-1 rounded-lg bg-yellow-400 text-black font-medium", children: "Close" }) })] }, r.orderId));
                                })] })] }) }), err && _jsx("div", { className: "mt-2 text-red-400", children: err })] }));
}
