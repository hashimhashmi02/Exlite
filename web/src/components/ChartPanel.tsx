import { useEffect, useRef } from "react";
import { trading } from "../lib/api";
import type { AssetSym } from "../lib/symbols";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp, // <-- important
} from "lightweight-charts";

type Props = { asset: AssetSym };

function toSec(ts: number) {
  // backend gives ms; chart wants seconds
  return ts > 1_000_000_000_000 ? Math.floor(ts / 1000) : Math.floor(ts);
}

export default function ChartPanel({ asset }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLineRef = useRef<ReturnType<
    ISeriesApi<"Candlestick">["createPriceLine"]
  > | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;

    const chart = createChart(wrapRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0b1220" },
        textColor: "rgba(255,255,255,0.85)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        fixLeftEdge: true,
      },
      crosshair: { mode: 0 },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
      priceLineVisible: true,
      priceLineColor: "rgba(255,214,10,0.9)",
      priceLineStyle: LineStyle.Solid,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => chart.applyOptions({ autoSize: true }));
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let candleTimer: any;
    let priceTimer: any;

    async function loadCandles() {
      if (!seriesRef.current) return;
      try {
        const rows = await trading.klines(asset, 300);

        // map with correct branded time
        const data: CandlestickData[] = rows.map((r) => ({
          time: toSec(Number(r[0])) as UTCTimestamp, // <-- fix
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
        }));

        if (cancelled || !data.length) return;

        data.sort(
          (a, b) =>
            (a.time as number) - (b.time as number) // TS-friendly compare
        );

        seriesRef.current.setData(data);
        chartRef.current?.timeScale().fitContent();
      } catch {
        // keep last good chart
      }
    }

    async function tickPriceLine() {
      if (!seriesRef.current) return;
      try {
        const p = await trading.price(asset);
        const price = Number(p.price);
        if (!Number.isFinite(price)) return;

        if (priceLineRef.current) {
          seriesRef.current.removePriceLine(priceLineRef.current);
        }
        priceLineRef.current = seriesRef.current.createPriceLine({
          price,
          color: "rgba(255,214,10,0.9)",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${asset}`,
        });
      } catch {
        /* ignore */
      }
    }

    loadCandles();
    tickPriceLine();

    candleTimer = setInterval(loadCandles, 5000);
    priceTimer = setInterval(tickPriceLine, 2000);

    return () => {
      cancelled = true;
      clearInterval(candleTimer);
      clearInterval(priceTimer);
    };
  }, [asset]);

  return (
    <div className="rounded-2xl bg-[#0f1620] border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="text-lg font-semibold">{asset} · 1m</div>
        <div className="text-sm text-white/60">Indicators ▾</div>
      </div>
      <div ref={wrapRef} className="h-[560px]" />
    </div>
  );
}
