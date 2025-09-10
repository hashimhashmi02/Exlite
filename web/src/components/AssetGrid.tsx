import AssetCard from "./AssetCard";
import type { Asset } from "../lib/api";

export default function AssetGrid({ assets, onPick }: { assets: Asset[]; onPick: (s: string) => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-6">
      <h2 className="text-sm uppercase tracking-widest text-white/60 mb-3">Assets</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map(a => <AssetCard key={a.symbol} a={a} onPick={onPick} />)}
        {assets.length === 0 && <div className="text-white/60">No assets found.</div>}
      </div>
    </section>
  );
}


