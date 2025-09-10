import { useEffect, useState } from "react";
import { trading } from "../lib/api";

export default function BalanceBar() {
  const [usd, setUsd] = useState<number | null>(null);

  useEffect(() => {
    trading.balanceUsd().then(r => setUsd(r.balance)).catch(() => {});
  }, []);

  const pretty = (cents: number | null) =>
    cents == null ? "—" : `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-6xl px-4 mt-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <div className="text-sm text-white/70">USD Balance</div>
        <div className="text-lg font-semibold">{pretty(usd)}</div>
      </div>
    </div>
  );
}
