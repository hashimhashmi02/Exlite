import { useState } from "react";
import Instruments from "../components/Instruments";
import ChartPanel from "../components/ChartPanel";
import TradePanel from "../components/TradePanel";
import type { AssetSym } from "../lib/symbols";

export default function Trade() {
  const [picked, setPicked] = useState<AssetSym>("BTC");

  return (
    <div className="grid grid-cols-[360px_1fr_420px] gap-6 h-full">
      <Instruments picked={picked} onPick={setPicked} />
      <ChartPanel asset={picked} />
      <TradePanel asset={picked} />
    </div>
  );
}
