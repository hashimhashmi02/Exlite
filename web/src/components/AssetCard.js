import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function AssetCard({ a, onPick }) {
    return (_jsxs("button", { onClick: () => onPick?.(a.symbol), className: "group border border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition flex items-center gap-3 w-full text-left", children: [_jsx("img", { src: a.imageUrl, alt: a.symbol, className: "w-8 h-8 rounded-full" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-semibold", children: a.symbol }), _jsx("div", { className: "text-xs text-white/60", children: a.name })] }), _jsx("div", { className: "text-xs text-yellow-300/90 opacity-0 group-hover:opacity-100 transition", children: "Trade" })] }));
}
