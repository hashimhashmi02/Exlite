import { useEffect, useMemo, useState } from "react";
import { type OpenOrderDTO, trading, orders } from "../lib/api";

type Row = OpenOrderDTO & {
  current?: number; // current price (human)
  entryHuman?: number;
  pnl?: number;     // USD
};

function prettyUSD(n?: number) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function OpenOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { orders: list } = await orders.open();
    // fetch current prices per distinct asset
    const uniq = [...new Set(list.map(o => o.asset))];
    const priceMap: Record<string, number> = {};
    await Promise.all(uniq.map(async a => {
      try { const p = await trading.price(a); priceMap[a] = Number(p.price); } catch {}
    }));

    const mapped: Row[] = list.map(o => {
      const entryHuman = Number(o.entryPrice) / 10 ** o.assetDecimals;
      const current = priceMap[o.asset];
      let pnl: number | undefined = undefined;
      if (current != null) {
        const exposureUsd = (Number(o.marginCents) / 100) * o.leverage;
        const ret = (current - entryHuman) / entryHuman;
        pnl = (o.side === 'LONG' ? ret : -ret) * exposureUsd;
      }
      return { ...o, entryHuman, current, pnl };
    });

    setRows(mapped);
    setLoading(false);
  }

  useEffect(() => {
    let t: any;
    const loop = async () => { try { await refresh(); } catch {} t = setTimeout(loop, 3000); };
    loop();
    return () => clearTimeout(t);
  }, []);

  const totalPnl = useMemo(() => rows.reduce((s, r) => s + (r.pnl ?? 0), 0), [rows]);

  async function closeOne(id: string) {
    try {
      await trading.close(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'Close failed');
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm uppercase tracking-wider text-white/60">Open Positions</h3>
        <div className={`text-sm ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{prettyUSD(totalPnl)}</div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Current</th>
              <th className="px-3 py-2 text-right">P/L</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-4 text-white/60" colSpan={7}>No open positions.</td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.orderId} className="border-t border-white/10">
                <td className="px-3 py-2 font-medium">{r.asset}</td>
                <td className="px-3 py-2">{r.side}</td>
                <td className="px-3 py-2 text-right">{prettyUSD(Number(r.marginCents)/100)}</td>
                <td className="px-3 py-2 text-right">{r.entryHuman?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.current?.toLocaleString() ?? '—'}</td>
                <td className={`px-3 py-2 text-right ${ (r.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {prettyUSD(r.pnl)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => closeOne(r.orderId)}
                    className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5"
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
