import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function OneClickOverlay({ symbol, bid, ask, onTrade, disabled }) {
    const [lotSizeStr, setLotSizeStr] = useState("0.36");
    const [leverage, setLeverage] = useState(10);
    const lotSize = parseFloat(lotSizeStr) || 0.01;
    const handleLotSizeChange = (e) => {
        setLotSizeStr(e.target.value);
    };
    const handleLotSizeBlur = () => {
        const val = parseFloat(lotSizeStr);
        if (!val || val < 0.01) {
            setLotSizeStr("0.01");
        }
        else {
            setLotSizeStr(val.toString());
        }
    };
    const spread = ((ask - bid) / ask * 100).toFixed(3);
    return (_jsxs("div", { className: "absolute top-3 right-3 flex items-center gap-1 z-10", children: [_jsxs("button", { onClick: () => !disabled && onTrade('short', lotSize * 100000, leverage), disabled: disabled, className: "flex flex-col items-center justify-center px-4 py-2 bg-[#ff4d4f] hover:bg-[#ff6b6d] text-white rounded-l transition-colors disabled:opacity-50", children: [_jsx("span", { className: "text-[10px] uppercase font-medium", children: "Sell" }), _jsx("span", { className: "text-sm font-bold font-mono", children: bid.toLocaleString(undefined, { minimumFractionDigits: 3 }) })] }), _jsxs("div", { className: "flex flex-col items-center bg-[#1a1d24] border border-[#2a2e39] px-3 py-1.5", children: [_jsx("input", { type: "text", inputMode: "decimal", value: lotSizeStr, onChange: handleLotSizeChange, onBlur: handleLotSizeBlur, className: "w-20 bg-transparent text-center text-white text-sm font-mono outline-none" }), _jsxs("span", { className: "text-[10px] text-gray-500", children: [spread, " spread"] })] }), _jsxs("button", { onClick: () => !disabled && onTrade('long', lotSize * 100000, leverage), disabled: disabled, className: "flex flex-col items-center justify-center px-4 py-2 bg-[#2962ff] hover:bg-[#4a7dff] text-white rounded-r transition-colors disabled:opacity-50", children: [_jsx("span", { className: "text-[10px] uppercase font-medium", children: "Buy" }), _jsx("span", { className: "text-sm font-bold font-mono", children: ask.toLocaleString(undefined, { minimumFractionDigits: 3 }) })] })] }));
}
