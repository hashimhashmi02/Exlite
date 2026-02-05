import { useEffect, useRef, memo } from "react";
import type { AssetSym } from "../lib/symbols";

type Props = { asset: AssetSym; height?: number; interval?: string };

const MAP_SYM: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  XRP: "BINANCE:XRPUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  ADA: "BINANCE:ADAUSDT",
  AVAX: "BINANCE:AVAXUSDT",
  MATIC: "BINANCE:MATICUSDT",
  LINK: "BINANCE:LINKUSDT",
};

const MAP_INT: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "1H": "60",
  "4H": "240",
  "1D": "D",
};

export default memo(function ChartPanel({ asset, height = 520, interval = "1m" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Unique ID for the container to avoid conflicts
    const containerId = `tv_chart_${Math.random().toString(36).substring(7)}`;
    if (container.current) {
      container.current.id = containerId;
    }

    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
      scriptRef.current = script;
    } else {
      initWidget();
    }

    function initWidget() {
      if (container.current && (window as any).TradingView) {
        // Clear previous content just in case
        container.current.innerHTML = "";

        new (window as any).TradingView.widget({
          "width": "100%",
          "height": height,
          "symbol": MAP_SYM[asset] || `BINANCE:${asset}USDT`,
          "interval": MAP_INT[interval] || "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "container_id": containerId,
          "backgroundColor": "rgba(17, 24, 39, 1)",
          "gridLineColor": "rgba(255, 255, 255, 0.06)",
          "overrides": {
            "paneProperties.background": "#111827",
            "paneProperties.vertGridProperties.color": "#1f2937",
            "paneProperties.horzGridProperties.color": "#1f2937",
            "scalesProperties.textColor": "#9ca3af",
          }
        });
      }
    }

    // Cleanup isn't strict for script, but we can clear container
    return () => {
      if (container.current) container.current.innerHTML = "";
    };
  }, [asset, height, interval]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-white/5 bg-gray-900">
      <div ref={container} className="w-full" style={{ height }} />
    </div>
  );
});
