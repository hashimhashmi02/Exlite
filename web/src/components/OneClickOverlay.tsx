import { useState } from 'react';

type Props = {
    symbol: string;
    bid: number;
    ask: number;
    onTrade: (side: 'long' | 'short', lotSize: number, leverage: number) => void;
    disabled?: boolean;
};

export default function OneClickOverlay({ symbol, bid, ask, onTrade, disabled }: Props) {
    const [lotSizeStr, setLotSizeStr] = useState("0.36");
    const [leverage, setLeverage] = useState(10);

    const lotSize = parseFloat(lotSizeStr) || 0.01;

    const handleLotSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLotSizeStr(e.target.value);
    };

    const handleLotSizeBlur = () => {
        const val = parseFloat(lotSizeStr);
        if (!val || val < 0.01) {
            setLotSizeStr("0.01");
        } else {
            setLotSizeStr(val.toString());
        }
    };

    const spread = ((ask - bid) / ask * 100).toFixed(3);

    return (
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
            {/* Sell Button */}
            <button
                onClick={() => !disabled && onTrade('short', lotSize * 100000, leverage)}
                disabled={disabled}
                className="flex flex-col items-center justify-center px-4 py-2 bg-[#ff4d4f] hover:bg-[#ff6b6d] text-white rounded-l transition-colors disabled:opacity-50"
            >
                <span className="text-[10px] uppercase font-medium">Sell</span>
                <span className="text-sm font-bold font-mono">{bid.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
            </button>

            {/* Center - Lot Size */}
            <div className="flex flex-col items-center bg-[#1a1d24] border border-[#2a2e39] px-3 py-1.5">
                <input
                    type="text"
                    inputMode="decimal"
                    value={lotSizeStr}
                    onChange={handleLotSizeChange}
                    onBlur={handleLotSizeBlur}
                    className="w-20 bg-transparent text-center text-white text-sm font-mono outline-none"
                />
                <span className="text-[10px] text-gray-500">{spread} spread</span>
            </div>

            {/* Buy Button */}
            <button
                onClick={() => !disabled && onTrade('long', lotSize * 100000, leverage)}
                disabled={disabled}
                className="flex flex-col items-center justify-center px-4 py-2 bg-[#2962ff] hover:bg-[#4a7dff] text-white rounded-r transition-colors disabled:opacity-50"
            >
                <span className="text-[10px] uppercase font-medium">Buy</span>
                <span className="text-sm font-bold font-mono">{ask.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
            </button>
        </div>
    );
}
