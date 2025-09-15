import { useEffect, useRef, useState } from "react";
import { trading } from "../lib/api";
import { createChart, ColorType } from "lightweight-charts";

export default function ChartPanel({ asset }: { asset: string | null }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);


  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [title, setTitle] = useState("—");


  useEffect(() => {
    if (!wrapRef.current) return;

    const chart: any = createChart(wrapRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.85)",
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
      timeScale: { borderColor: "rgba(255,255,255,0.12)", timeVisible: true, secondsVisible: false },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      crosshair: { mode: 0 },
    });

    const series: any = chart.addCandlestickSeries();
    series.applyOptions({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      chart.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) });
    });
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let timer: any;
    async function load() {
      if (!asset || !seriesRef.current || !chartRef.current) {
        seriesRef.current?.setData?.([]);
        setTitle("—");
        return;
      }
      setTitle(asset);
      const rows = await trading.klines(asset, 240);
      const data = rows.map((r) => ({
        time: Math.floor(r[0] / 1000),
        open: Number(r[1]),
        high: Number(r[2]),
        low:  Number(r[3]),
        close:Number(r[4]),
      }));
      seriesRef.current.setData(data);
      chartRef.current.timeScale().fitContent();
    }
    load();
    timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [asset]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="font-medium">{title} · 1m</div>
        <div className="text-xs text-white/60">Indicators ▾</div>
      </div>
      <div className="flex-1 p-1 min-w-0">
        <div ref={wrapRef} className="w-full h-full rounded-xl overflow-hidden" />
      </div>
    </div>
  );
}
