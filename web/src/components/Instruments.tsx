import { useEffect, useMemo, useState } from "react";
import { type Asset, quotes } from "../lib/api";

type Row = Asset & { bid?: number; ask?: number };

export default function Instruments({ assets, onPick, picked }:{
  assets: Asset[]; onPick(symbol:string):void; picked?: string;
}) {
  const [rows, setRows] = useState<Row[]>(assets);
  const [q, setQ] = useState('');

  useEffect(()=> setRows(assets), [assets]);

  useEffect(()=>{
    let stop=false;
    const loop = async ()=>{
      if (!assets.length) return;
      try{
        const { quotes: book } = await quotes.get(assets.map(a=>a.symbol));
        setRows(prev => prev.map(r => ({
          ...r, bid: book[r.symbol]?.bid, ask: book[r.symbol]?.ask
        })));
      }catch{}
      if (!stop) setTimeout(loop, 2000);
    };
    loop();
    return ()=>{ stop=true; };
  },[assets]);

  const filtered = useMemo(()=>{
    const s=q.toLowerCase();
    return rows.filter(r => (r.symbol + r.name).toLowerCase().includes(s));
  },[rows,q]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-white/10 text-sm uppercase tracking-wider text-white/60">
        Instruments
      </div>
      <div className="p-3">
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search"
          className="w-full rounded-lg bg-white text-black px-3 py-2 outline-none placeholder:text-black/60" />
      </div>

      <div className="px-3 pb-2 text-[11px] uppercase text-white/40 grid grid-cols-[1fr,110px,110px] gap-2">
        <div>Symbol</div><div className="text-right">Bid</div><div className="text-right">Ask</div>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-3 space-y-2">
        {filtered.map(a=>(
          <button key={a.symbol} onClick={()=>onPick(a.symbol)}
            className={`w-full grid grid-cols-[1fr,110px,110px] items-center gap-2 px-3 py-2 rounded-xl border transition
              ${picked===a.symbol?'bg-white text-black border-transparent':'border-white/10 hover:bg-white/10'}`}>
            <div className="flex items-center gap-2">
              <img src={a.imageUrl} className="w-5 h-5 rounded-full" />
              <div className="text-sm font-medium">{a.symbol}</div>
            </div>
            <div className={`${picked===a.symbol?'text-black/70':'text-white/80'} text-right text-sm`}>
              {a.bid!=null ? a.bid.toLocaleString() : '—'}
            </div>
            <div className={`${picked===a.symbol?'text-black/70':'text-white/80'} text-right text-sm`}>
              {a.ask!=null ? a.ask.toLocaleString() : '—'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
