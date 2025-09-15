import { useEffect, useState } from "react";
import { orders, type OpenOrderDTO, trading } from "../lib/api";

const usd = (n?: number) =>
  n == null || !Number.isFinite(n)
    ? "$0.00"
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function OpenOrders() {
  const [rows, setRows] = useState<OpenOrderDTO[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await orders.open();
      setRows(r.orders || []);
    } catch {}
  }

  // poll every 2s
  useEffect(() => {
    let stop = false;
    const loop = async () => {
      await load();
      if (!stop) setTimeout(loop, 2000);
    };
    loop();
    return () => {
      stop = true;
    };
  }, []);

  async function closeOrder(id: string) {
    setBusyId(id);
    try {
      await trading.close(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm uppercase tracking-wider text-white/60">Open</h3>
      </div>
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
                <td className="px-3 py-4 text-white/60" colSpan={6}>
                  No open orders.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const dec = Number(r.assetDecimals ?? 2);
              const entry = r.entryPrice ? Number(r.entryPrice) / 10 ** dec : undefined;
              const margin = Number(r.marginCents ?? 0) / 100;
              return (
                <tr key={r.orderId} className="border-t border-white/10">
                  <td className="px-3 py-2">{r.asset}</td>
                  <td className="px-3 py-2">{r.side}</td>
                  <td className="px-3 py-2 text-right">{usd(margin)}</td>
                  <td className="px-3 py-2 text-right">{r.leverage}x</td>
                  <td className="px-3 py-2 text-right">{entry?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="px-3 py-1 rounded-lg bg-white text-black disabled:opacity-60"
                      disabled={busyId === r.orderId}
                      onClick={() => closeOrder(r.orderId)}
                    >
                      {busyId === r.orderId ? "Closing…" : "Close"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
