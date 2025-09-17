import { useEffect, useMemo, useState } from "react";
import { api, quotes } from "../lib/api";
import { type AssetSym, DEFAULT_ASSETS } from "../lib/symbols";

type AssetRow = { symbol: AssetSym; name: string; imageUrl?: string };
type Props = {
  picked: AssetSym;
  onPick: (s: AssetSym) => void;
};

export default function Instruments({ picked, onPick }: Props) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [bbo, setBbo] = useState<Record<string, { bid: number; ask: number }>>({});
  const [qErr, setQErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { assets } = await api.supportedAssets();
        const cleaned = assets
          .map(a => a.symbol.toUpperCase())
          .filter(s => s === "BTC" || s === "ETH" || s === "SOL") as AssetSym[];

        const rows: AssetRow[] =
          cleaned.length
            ? cleaned.map(s => ({ symbol: s, name: s === "BTC" ? "Bitcoin" : s === "ETH" ? "Ethereum" : "Solana" }))
            : DEFAULT_ASSETS;

        if (!cancelled) setAssets(rows);
      } catch (e) {
  
        if (!cancelled) setAssets(DEFAULT_ASSETS);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  const symbols = useMemo(() => assets.map(a => a.symbol), [assets]);
  useEffect(() => {
    if (!symbols.length) return;
    let timer: any;
    let cancelled = false;

    const poll = async () => {
      try {
        const { quotes: q } = await quotes.get(symbols);
        if (!cancelled) {
          const next: Record<string, { bid: number; ask: number }> = {};
          for (const [sym, v] of Object.entries(q)) next[sym] = { bid: v.bid, ask: v.ask };
          setBbo(next);
          setQErr(null);
        }
      } catch (err: any) {
        if (!cancelled) setQErr(err?.message ?? "quotes error");
      }
    };
    poll();
    timer = setInterval(poll, 2000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [symbols]);

  return (
    <div className="rounded-2xl bg-[#0f1620] border border-white/5 p-4">
      <h2 className="text-xl font-semibold mb-3">INSTRUMENTS</h2>

      <input
        placeholder="Search"
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 outline-none focus:ring-2 ring-white/10"
      />

      <div className="grid grid-cols-3 text-white/60 text-sm px-2 pb-2">
        <div>SYMBOL</div><div className="text-right">BID</div><div className="text-right">ASK</div>
      </div>

      <div className="space-y-2">
        {assets.map((a) => {
          const q = bbo[a.symbol] || { bid: 0, ask: 0 };
          const isPicked = picked === a.symbol;
          return (
            <button
              key={a.symbol}
              onClick={() => onPick(a.symbol)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border
                ${isPicked ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/5 hover:bg-white/5"}`}
            >
              <div className="flex-1 font-medium">{a.symbol}</div>
              <div className="w-24 text-right tabular-nums">{q.bid ? q.bid.toLocaleString() : "—"}</div>
              <div className="w-24 text-right tabular-nums">{q.ask ? q.ask.toLocaleString() : "—"}</div>
            </button>
          );
        })}

        {!assets.length && (
          <div className="text-white/50 text-sm px-2 py-6 text-center">
            Loading instruments…
          </div>
        )}
        {qErr && (
          <div className="text-red-400/80 text-xs px-2 py-2">
            {qErr}
          </div>
        )}
      </div>
    </div>
  );
}
