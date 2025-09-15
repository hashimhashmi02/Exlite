import { useEffect, useState } from "react";
import { orders } from "../lib/api";

const usd = (n?: number) =>
  n == null || !Number.isFinite(n) ? "$0.00" :
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function History() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const r = await orders.closed(); setRows(r.orders ?? []); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Closed Orders</h2>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Leverage</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Exit</th>
              <th className="px-3 py-2 text-right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td className="px-3 py-4 text-white/60" colSpan={8}>No history.</td></tr>
            )}
            {rows.map((r) => {
              const dec = Number(r.assetDecimals ?? 2);
              const margin = Number(r.marginCents ?? 0) / 100;
              const entry = r.entryPrice ? Number(r.entryPrice) / 10**dec : undefined;
              const exit  = r.exitPrice  ? Number(r.exitPrice)  / 10**dec : undefined;
              const pnl   = r.pnlCents ? Number(r.pnlCents) / 100 : undefined;
              return (
                <tr key={r.orderId} className="border-t border-white/10">
                  <td className="px-3 py-2">{r.orderId}</td>
                  <td className="px-3 py-2">{r.asset}</td>
                  <td className="px-3 py-2">{r.side}</td>
                  <td className="px-3 py-2 text-right">{usd(margin)}</td>
                  <td className="px-3 py-2 text-right">{r.leverage}x</td>
                  <td className="px-3 py-2 text-right">{entry?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{exit?.toLocaleString() ?? "—"}</td>
                  <td className={`px-3 py-2 text-right ${ (pnl ?? 0) >= 0 ? "text-green-400":"text-red-400"}`}>{usd(pnl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
