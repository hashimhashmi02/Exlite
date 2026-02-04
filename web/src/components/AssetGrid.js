import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import AssetCard from "./AssetCard";
export default function AssetGrid({ assets, onPick }) {
    return (_jsxs("section", { className: "mx-auto max-w-6xl px-4 mt-6", children: [_jsx("h2", { className: "text-sm uppercase tracking-widest text-white/60 mb-3", children: "Assets" }), _jsxs("div", { className: "grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: [assets.map(a => _jsx(AssetCard, { a: a, onPick: onPick }, a.symbol)), assets.length === 0 && _jsx("div", { className: "text-white/60", children: "No assets found." })] })] }));
}
