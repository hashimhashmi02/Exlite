import type { Asset } from "../lib/api";

export default function AssetCard({ a, onPick }: { a: Asset; onPick?: (s: string) => void }) {
  return (
    <button
      onClick={() => onPick?.(a.symbol)}
      className="group border border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition flex items-center gap-3 w-full text-left"
    >
      <img src={a.imageUrl} alt={a.symbol} className="w-8 h-8 rounded-full" />
      <div className="flex-1">
        <div className="font-semibold">{a.symbol}</div>
        <div className="text-xs text-white/60">{a.name}</div>
      </div>
      <div className="text-xs text-yellow-300/90 opacity-0 group-hover:opacity-100 transition">Trade</div>
    </button>
  );
}
