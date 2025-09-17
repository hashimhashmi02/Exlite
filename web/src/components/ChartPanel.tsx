import { useEffect, useRef } from "react";
import { trading } from "../lib/api";
import type { AssetSym } from "../lib/symbols";

import { createChart, ColorType } from "lightweight-charts";

type UTSec = number;
type Candle = { time: UTSec; open: number; high: number; low: number; close: number };

function toSec(ts: number): UTSec {
  return ts > 1_000_000_000_000 ? Math.floor(ts / 1000) : Math.floor(ts);
}

type Props = { asset: AssetSym; height?: number };

export default function ChartPanel({ asset, height = 520 }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);
  const lastBarRef = useRef<Candle | null>(null);
  const pollRef = useRef<number | null>(null);
  const genRef = useRef<number>(0); 


  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(17,24,39,1)" }, // #111827
        textColor: "rgba(235,235,235,0.85)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
      timeScale: { borderColor: "rgba(255,255,255,0.12)" },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => chart.applyOptions({ autoSize: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

 
  useEffect(() => {
    genRef.current += 1; 
    const gen = genRef.current;

    
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    async function loadCandles() {
      if (!seriesRef.current) return;
      try {
        const raw = await trading.klines(asset, 500).catch(() => []);
        const rows: any[] = Array.isArray(raw) ? raw : [];

        const data: Candle[] = rows.map((r) => ({
          time: toSec(Number(r?.[0] ?? 0)),
          open: Number(r?.[1] ?? 0),
          high: Number(r?.[2] ?? 0),
          low: Number(r?.[3] ?? 0),
          close: Number(r?.[4] ?? 0),
        }));

        if (genRef.current !== gen || !data.length || !seriesRef.current) return;

        data.sort((a, b) => a.time - b.time);
        lastBarRef.current = data[data.length - 1];

        seriesRef.current.setData(data as any);
        chartRef.current?.timeScale().fitContent();
      } catch (e) {
        console.warn("klines load error:", e);
      }
    }

    async function tickPrice() {
      if (!seriesRef.current || !lastBarRef.current) return;
      try {
        const p = await trading.price(asset);
        const px = Number(p?.price);
        if (!Number.isFinite(px)) return;

        const last = lastBarRef.current;
        const next: Candle = {
          ...last,
          close: px,
          high: Math.max(last.high, px),
          low: Math.min(last.low, px),
        };

        lastBarRef.current = next;
        seriesRef.current.update(next as any);
      } catch {
      
      }
    }

  
    loadCandles();
    pollRef.current = window.setInterval(() => {
 
      loadCandles();
      tickPrice();
    }, 2000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [asset]);

  
  return (
    <div className="w-full">
      <div
        ref={wrapRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height }}   
      />
    </div>
  );
}
