import OpenOrders from "./OpenOrders";
import { useEffect, useMemo, useState } from "react";
import { trading } from "../lib/api";

type Props = { asset: string | null };

export default function TradePanel({ asset }: Props) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [margin, setMargin] = useState(50000); // cents
  const [leverage, setLev] = useState(10);
  const [price, setPrice] = useState<string>("—");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // poll live price
  useEffect(() => {
    let stop = false;
    async function tick() {
      if (!asset) { setPrice("—"); return; }
      try {
        const r = await trading.price(asset);
        setPrice(r.price);
      } catch { setPrice("—"); }
      if (!stop) setTimeout(tick, 2000);
    }
    tick();
    return () => { stop = true; };
  }, [asset]);

  const disabled = useMemo(() => !asset || busy, [asset, busy]);

  async function openTrade() {
    if (!asset) return;
    setBusy(true); setErr(null); setOrderId(null);
    try {
      const out = await trading.create({
        asset, type: side, margin, leverage, slippage: 100,
      });
      setOrderId(out.orderId);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="font-medium">Order</div>
        <div className="text-xs text-white/60">Market ▾</div>
      </div>

      {/* body */}
      <div className="p-4 overflow-auto h-full">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-white/60">Selected</div>
            <div className="text-lg font-semibold">{asset ?? "—"}</div>
            <div className="text-sm text-white/60">Price</div>
            <div className="text-lg font-semibold">${price}</div>
          </div>

          {/* responsive controls */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Side */}
            <div className="bg-black/30 rounded-xl p-3">
              <div className="text-xs text-white/60 mb-2">Side</div>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded-lg px-3 py-2 transition ${
                    side === "long" ? "bg-green-500/90 text-black" : "bg-white/10 hover:bg-white/15"
                  }`}
                  onClick={() => setSide("long")}
                >Long</button>
                <button
                  className={`flex-1 rounded-lg px-3 py-2 transition ${
                    side === "short" ? "bg-red-500/90 text-black" : "bg-white/10 hover:bg-white/15"
                  }`}
                  onClick={() => setSide("short")}
                >Short</button>
              </div>
            </div>

            {/* Margin */}
            <div className="bg-black/30 rounded-xl p-3">
              <div className="text-xs text-white/60 mb-2">Margin (USD)</div>
              <input
                type="number" min={10}
                className="w-full rounded-lg bg-white/10 px-3 py-2 outline-none"
                value={Math.round(margin / 100)}
                onChange={(e) => setMargin(Math.max(10, Number(e.target.value || 0)) * 100)}
              />
            </div>

            {/* Leverage */}
            <div className="bg-black/30 rounded-xl p-3">
              <div className="text-xs text-white/60 mb-2">Leverage</div>
              <select
                className="w-full rounded-lg bg-white/10 px-3 py-2 outline-none"
                value={leverage}
                onChange={(e) => setLev(Number(e.target.value))}
              >
                {[1,2,3,5,10,20,25,50,100].map(n => <option key={n} value={n}>{n}x</option>)}
              </select>
            </div>
          </div>

          {/* actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              disabled={disabled}
              onClick={openTrade}
              className="rounded-xl px-4 py-2 bg-yellow-400 text-black font-semibold disabled:opacity-60"
            >
              {busy ? "Placing…" : "Open Trade"}
            </button>
            {orderId && (
              <div className="text-sm text-white/80">
                Order ID: <span className="font-mono">{orderId}</span>
              </div>
            )}
            {err && <div className="text-sm text-red-400">{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
<OpenOrders />
