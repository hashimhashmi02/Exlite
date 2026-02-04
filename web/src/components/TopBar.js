import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Wallet } from "lucide-react";
export default function TopBar({ email, tabs }) {
    return (_jsx("header", { className: "sticky top-0 z-10 backdrop-blur bg-black/30 border-b border-white/10", children: _jsxs("div", { className: "px-3 sm:px-4 h-14 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "size-7 rounded-lg bg-yellow-400 grid place-items-center", children: _jsx(Wallet, { className: "size-4 text-black" }) }), _jsx("span", { className: "font-semibold tracking-wide", children: "Exlite" }), _jsx("nav", { className: "ml-4 hidden md:flex items-center gap-2", children: tabs.map(t => (_jsx("button", { onClick: t.onClick, className: `px-3 py-1.5 rounded-full text-sm border transition
                  ${t.active ? 'bg-white text-black border-transparent' : 'border-white/15 hover:bg-white/10'}`, children: t.symbol }, t.symbol))) })] }), _jsx("div", { className: "text-xs text-white/70", children: email })] }) }));
}
