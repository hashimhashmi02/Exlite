import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Shell({ left, center, right, top }) {
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [top, _jsx("div", { className: "flex-1 px-3 sm:px-4 py-3", children: _jsxs("div", { className: "grid h-full gap-3 sm:gap-4\r\n                        grid-cols-[320px,minmax(0,1fr),420px]", children: [_jsx("aside", { className: "rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden", children: left }), _jsx("main", { className: "rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden min-w-0", children: center }), _jsx("aside", { className: "rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden", children: right })] }) })] }));
}
