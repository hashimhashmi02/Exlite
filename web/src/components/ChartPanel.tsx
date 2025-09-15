import { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { trading } from "../lib/api";

type Bar = { time: number; open: number; high: number; low: number; close: number };

const toSec = (t: number) => (t > 1_000_000_000_000 ? Math.floor(t / 1000) : Math.floor(t));
const minuteStart = (s = Math.floor(Date.now() / 1000)) => Math.floor(s / 60) * 60;

function mapRows(rows: any[]): Bar[] {
  return (rows ?? [])
    .map((r) => ({
      time: toSec(Number(r[0])),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
    }))
    .filter(
      (c) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close),
    )
    .sort((a, b) => a.time - b.time);
}

/** If range is 0 (all same prices), add a tiny epsilon so bodies are visible */
function softenFlat(bars: Bar[]): Bar[] {
  if (!bars.length) return bars;
  let min = Infinity,
    max = -Infinity;
  for (const b of bars) {
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  if (isFinite(min) && isFinite(max) && Math.abs(max - min) < 1e-9) {
    bars.forEach((b, i) => {
      const eps = ((i % 2 ? 1 : -1) * 0.02); // ~2 cents wiggle
      b.high = Math.max(b.high, b.close + Math.abs(eps));
      b.low = Math.min(b.low, b.close - Math.abs(eps));
    });
  }
  return bars;
}

export default function ChartPanel({ asset }: { asset: string | null }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any | null>(null);
  const lastBarRef = useRef<Bar | null>(null);
  const timerRef = useRef<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const [title, setTitle] = useState("—");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || chartRef.current) return;

    // Create chart once
    const chart = createChart(wrapRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b1220" },
        textColor: "rgba(255,255,255,0.85)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.12)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
      timeScale: { borderColor: "rgba(255,255,255,0.12)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries();
    series.applyOptions({
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });
    seriesRef.current = series;
    setReady(true);

    // Resize handling
    const fit = () => {
      if (!wrapRef.current || !chartRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) });
      chartRef.current.timeScale().fitContent();
    };
    fit();
    const ro = new ResizeObserver(fit);
    roRef.current = ro;
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      roRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      setReady(false);
    };
  }, []);

  // Seed + live updates
  useEffect(() => {
    if (!asset || !ready || !seriesRef.current) {
      setTitle("—");
      return;
    }
    setTitle(`${asset} · 1m`);
    const symbol = asset!;


    async function seed() {
      try {
        const rows = await trading.klines(symbol, 240);
        let bars = softenFlat(mapRows(rows)).slice(-500);
        if (!bars.length) {
          // Bootstrap from current price if klines are empty
          const p = await trading.price(symbol);
          const px = Number((p as any).price);
          const now = minuteStart();
          bars = Array.from({ length: 120 }, (_, i) => {
            const t = now - (119 - i) * 60;
            return { time: t, open: px, high: px + 0.01, low: px - 0.01, close: px };
          });
        }
        lastBarRef.current = bars[bars.length - 1] ?? null;
        if (seriesRef.current) {
          seriesRef.current.setData(bars as any);
          chartRef.current?.timeScale().fitContent();
        }
      } catch {
        // ignore seed errors; live loop will still run
      }
    }

    async function tick() {
      if (!asset || !seriesRef.current) return;
      try {
        const p = await trading.price(symbol);
        const px = Number((p as any).price);
        const nowMin = minuteStart();

        let last = lastBarRef.current;
        if (!last) {
          last = { time: nowMin, open: px, high: px, low: px, close: px };
        } else if (last.time === nowMin) {
          last = {
            ...last,
            high: Math.max(last.high, px),
            low: Math.min(last.low, px),
            close: px,
          };
        } else {
          last = { time: nowMin, open: last.close, high: px, low: px, close: px };
        }
        lastBarRef.current = last;
        seriesRef.current.update(last as any);
      } catch {
        // ignore one-off failures
      }
    }

    seed();

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(tick, 2000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [asset, ready]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-white/60">Indicators ▾</div>
      </div>
      <div className="flex-1 min-h-[300px]">
        <div ref={wrapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
