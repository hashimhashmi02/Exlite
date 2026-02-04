import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Wallet } from "lucide-react";
export default function Header({ email }) {
    return (_jsx("header", { className: "sticky top-0 z-10 backdrop-blur bg-black/20 border-b border-white/10", children: _jsxs("div", { className: "mx-auto max-w-6xl px-4 h-14 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "size-7 rounded-lg bg-yellow-400/90 grid place-items-center", children: _jsx(Wallet, { className: "size-4 text-black" }) }), _jsx("span", { className: "font-semibold tracking-wide", children: "Exlite" }), _jsx("span", { className: "ml-3 text-xs text-white/60 hidden sm:inline", children: "paper trading \u00B7 demo" })] }), _jsx("div", { className: "text-xs text-white/70", children: email })] }) }));
}
