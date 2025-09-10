import { useEffect, useMemo, useState } from "react";
import { type Asset, trading } from "../lib/api";

type Row = Asset & { last?: string };

export default function Instruments({ assets, onPick, picked }: {
  assets: Asset[]; onPick(symbol: string): void; picked?: string;
}) {
  const [rows, setRows] = useState<Row[]>(assets);

  useEffect(() => { setRows(assets); }, [assets]);

  // poll prices lightly
  useEffect(() => {
    let stop = false;
    const loop = async () => {
      for (const a of assets) {
        if (stop) break;
        try {
          const p = await trading.price(a.symbol);
          setRows(prev => prev.map(r => r.symbol === a.symbol ? { ...r, last: p.price } : r));
        } catch {}
      }
      setTimeout(loop, 3000);
    };
    loop();
    return () => { stop = true; };
  }, [assets]);

  const items = useMemo(() => rows, [rows]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-white/10 text-sm uppercase tracking-wider text-white/60">Instruments</div>
      <div className="p-3">
        <input
          placeholder="Search"
          className="w-full rounded-lg bg-white/10 px-3 py-2 outline-none text-sm"
          onChange={(e) => {
            const q = e.target.value.toLowerCase();
            setRows(assets.filter(a => (a.symbol + a.name).toLowerCase().includes(q)));
          }}
        />
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2 space-y-2">
        {items.map(a => (
          <button
            key={a.symbol}
            onClick={() => onPick(a.symbol)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition
              ${picked === a.symbol ? 'bg-white text-black border-transparent' : 'border-white/10 hover:bg-white/10'}`}>
            <div className="flex items-center gap-2">
              <img src={a.imageUrl} className="w-5 h-5 rounded-full" />
              <div className="text-sm font-medium">{a.symbol}</div>
            </div>
            <div className={`text-sm ${picked === a.symbol ? 'text-black/70' : 'text-white/70'}`}>
              {a.last ? `$${a.last}` : '—'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
