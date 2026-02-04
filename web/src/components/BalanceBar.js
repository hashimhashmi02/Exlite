import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { trading } from "../lib/api";
export default function BalanceBar() {
    const [usd, setUsd] = useState(null);
    useEffect(() => {
        trading.balanceUsd().then(r => setUsd(r.balance)).catch(() => { });
    }, []);
    const pretty = (cents) => cents == null ? "—" : `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return (_jsx("div", { className: "mx-auto max-w-6xl px-4 mt-6", children: _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between", children: [_jsx("div", { className: "text-sm text-white/70", children: "USD Balance" }), _jsx("div", { className: "text-lg font-semibold", children: pretty(usd) })] }) }));
}
