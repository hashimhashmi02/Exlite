import { orders as ordersApi, trading } from '../lib/api';
import { useEffect, useState } from 'react';

export default function OpenOrdersTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const { orders } = await ordersApi.open();
    setRows(orders);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  async function closeOrder(orderId: string) {
    try {
      setBusy(orderId);
      await trading.close(orderId);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length) return <div className="text-white/60 px-4 py-3">No open orders.</div>;

  return (
    <table className="w-full">
      <thead>{/* ... headers ... */}</thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.orderId}>
            <td>{r.asset}</td>
            <td>{r.side}</td>
            <td>${(Number(r.marginCents) / 100).toFixed(2)}</td>
            <td>{r.leverage}x</td>
            <td>{r.entryPrice ? Number(r.entryPrice).toFixed( r.assetDecimals ?? 2 ) : '—'}</td>
            <td>
              <button
                onClick={() => closeOrder(r.orderId)}
                disabled={busy === r.orderId}
                className="rounded-md px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm disabled:opacity-60"
              >
                {busy === r.orderId ? 'Closing…' : 'Close'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
