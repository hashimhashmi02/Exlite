import { useEffect, useState } from "react";
import { orders, trading, type OpenOrderDTO } from "../lib/api";

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function OpenOrdersTable() {
  const [rows, setRows] = useState<OpenOrderDTO[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const { orders: os } = await orders.open();
      setRows(os ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load open orders");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000); // light polling to reflect new opens
    return () => clearInterval(t);
  }, []);

  async function closeOrder(id: string) {
    setErr(null);
    try {
      await trading.close(id);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to close");
    }
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm uppercase tracking-wider text-white/60 mb-2">Open</h3>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Leverage</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-white/60" colSpan={6}>No open orders.</td>
              </tr>
            )}
            {rows.map((r) => {
              const dec = Number(r.assetDecimals ?? 2);
              const entry = r.entryPrice
                ? Number(r.entryPrice) / 10 ** dec
                : undefined;
              const margin = Number(r.marginCents ?? "0") / 100;
              return (
                <tr key={r.orderId} className="border-t border-white/10">
                  <td className="px-3 py-2 font-medium">{r.asset}</td>
                  <td className="px-3 py-2">{r.side}</td>
                  <td className="px-3 py-2 text-right">{usd(margin)}</td>
                  <td className="px-3 py-2 text-right">{r.leverage}x</td>
                  <td className="px-3 py-2 text-right">
                    {entry?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => closeOrder(r.orderId)}
                      className="px-3 py-1 rounded-lg bg-yellow-400 text-black font-medium"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {err && <div className="mt-2 text-red-400">{err}</div>}
    </div>
  );
}
