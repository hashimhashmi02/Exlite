import { useEffect, useState } from "react";
import Shell from "../layouts/Shell";
import { api, type Asset } from "../lib/api";
import Instruments from "../components/Instruments";
import ChartPanel from "../components/ChartPanel";
import TradePanel from "../components/TradePanel";

export default function Trade() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const a = await api.supportedAssets();
      setAssets(a.assets);
      if (!picked && a.assets.length) setPicked(a.assets[0].symbol);
    })();
  }, []);

  return (
    <Shell
      left={<Instruments assets={assets} onPick={setPicked} picked={picked ?? undefined} />}
      center={<ChartPanel asset={picked} />}
      right={<TradePanel asset={picked} />}
    />
  );
}
