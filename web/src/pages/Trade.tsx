import { useEffect, useMemo, useState } from "react";
import { api, quotes as quoteApi, type Asset } from "../lib/api";
import ChartPanel from "../components/ChartPanel";
import TradePanel from "../components/TradePanel";

type Sym = "BTC" | "ETH" | "SOL";

export default function Trade() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picked, setPicked] = useState<Sym>("BTC");
  const [q, setQ] = useState<Record<string, { bid: number; ask: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await api.supportedAssets();
        if (dead) return;
        setAssets(r?.assets ?? []);
      } catch {
        if (dead) return;
        setAssets([]); 
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    if (!assets || assets.length === 0) return;
    let stop = false;

    const syms = assets.map(a => a.symbol).filter(Boolean);
    const loop = async () => {
      try {
        const r = await quoteApi.get(syms);
        if (!stop) setQ(
          Object.fromEntries(
            Object.entries(r.quotes || {}).map(([k, v]: any) => [k, { bid: v?.bid ?? 0, ask: v?.ask ?? 0 }])
          )
        );
      } catch {
        if (!stop) setQ(null);
      }
      if (!stop) setTimeout(loop, 1_500);
    };
    loop();

    return () => { stop = true; };
  }, [assets]);
      const rows = useMemo(() => {
      const qs = q || {};
      const list = (assets || []).map(a => {
      const sym = a.symbol;
      const bid = qs[sym]?.bid ?? 0;
      const ask = qs[sym]?.ask ?? 0;
      return { sym, name: a.name, bid, ask };
    });

    const order: Sym[] = ["BTC", "ETH", "SOL"];
    const keep = new Set(order);
    const filtered = list.filter(r => keep.has(r.sym as Sym));
    filtered.sort((a, b) => order.indexOf(a.sym as Sym) - order.indexOf(b.sym as Sym));
    return filtered;
  }, [assets, q]);

  const safePicked: Sym = (["BTC", "ETH", "SOL"].includes(picked) ? picked : "BTC") as Sym;

  if (loading) {
    return (
      <div className="p-8 text-white/70">Loading market…</div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6">

      <div className="col-span-12 xl:col-span-3">
        <h2 className="text-xl font-semibold mb-3">INSTRUMENTS</h2>
        <div className="space-y-2">
          {(rows ?? []).map(r => (
            <button
              key={r.sym}
              onClick={() => setPicked(r.sym as Sym)}
              className={`w-full text-left rounded-xl px-4 py-3 border border-white/10 hover:bg-white/5 ${
                safePicked === (r.sym as Sym) ? "bg-white/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.sym}</div>
                <div className="text-white/70">
                  <span className="mr-4">{r.bid ? r.bid.toLocaleString() : "—"}</span>
                  <span>{r.ask ? r.ask.toLocaleString() : "—"}</span>
                </div>
              </div>
            </button>
          ))}
          {(rows?.length ?? 0) === 0 && (
            <div className="text-white/50">No assets available.</div>
          )}
        </div>
      </div>
      
      <div className="col-span-12 xl:col-span-9 grid grid-cols-12 gap-6">
        <div className="col-span-12 2xl:col-span-8">
          <ChartPanel asset={safePicked} />
        </div>
        <div className="col-span-12 2xl:col-span-4">
          <TradePanel asset={safePicked} />
        </div>
      </div>
    </div>
  );
}
