import { useEffect, useMemo, useState } from "react";
import { api, quotes as quoteApi, trading, orders as ordersApi, type Asset } from "../lib/api";
import ChartPanel from "../components/ChartPanel";
import Sidebar from "../components/Sidebar";
import MarketWatchPanel from "../components/MarketWatchPanel";
import OneClickOverlay from "../components/OneClickOverlay";
import BottomPanel from "../components/BottomPanel";

type Sym = "BTC" | "ETH" | "SOL";

type Instrument = {
  symbol: string;
  name?: string;
  bid: number;
  ask: number;
  signal?: 'up' | 'down' | 'neutral';
};

export default function Trade() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picked, setPicked] = useState<Sym>("BTC");
  const [q, setQ] = useState<Record<string, { bid: number; ask: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('1m');
  // Initial asset load
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await api.supportedAssets();
        if (dead) return;
        setAssets(r?.assets ?? []);

        // Load initial orders
        const { orders } = await ordersApi.open();
        setOpenOrders(mapOrders(orders));

        // Load closed orders
        const { orders: closed } = await ordersApi.closed();
        setClosedOrders(mapClosedOrders(closed));
      } catch {
        if (dead) return;
        setAssets([]);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  // Poll quotes
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    let stop = false;

    const syms = assets.map(a => a.symbol).filter(Boolean);
    const loop = async () => {
      try {
        const r = await quoteApi.get(syms);
        if (!stop) setQ(
          Object.fromEntries(
            Object.entries(r.quotes || {}).map(([k, v]: any) => [k, { bid: v?.bid ?? 0, ask: v?.ask ?? 0 }])
          )
        );
      } catch {
        if (!stop) setQ(null);
      }
      if (!stop) setTimeout(loop, 1_500);
    };
    loop();

    return () => { stop = true; };
  }, [assets]);

  // Poll orders and account info
  useEffect(() => {
    let stop = false;
    const loop = async () => {
      try {
        const [openRes, closedRes] = await Promise.all([
          ordersApi.open(),
          ordersApi.closed()
        ]);
        if (!stop) {
          setOpenOrders(mapOrders(openRes.orders));
          setClosedOrders(mapClosedOrders(closedRes.orders));
        }
      } catch { }
      if (!stop) setTimeout(loop, 2000);
    };
    loop();
    return () => { stop = true; };
  }, []);

  // Helper to map API DTO to UI format
  const mapOrders = (dtos: any[]): any[] => {
    return dtos.map(o => ({
      id: o.orderId,
      symbol: o.asset,
      side: o.side.toLowerCase(),
      margin: Number(o.marginCents),
      leverage: o.leverage,
      entryPrice: Number(o.entryPrice ?? 0),
      pnl: 0 // Mock PnL for now or calculate using current price
    }));
  };

  const mapClosedOrders = (dtos: any[]): any[] => {
    return dtos.map(o => ({
      id: o.orderId,
      symbol: o.asset,
      side: o.side.toLowerCase(),
      margin: Number(o.marginCents),
      leverage: o.leverage,
      entryPrice: Number(o.entryPrice ?? 0),
      exitPrice: Number(o.exitPrice ?? 0),
      pnl: Number(o.pnlCents ?? 0)
    }));
  };

  const instruments: Instrument[] = useMemo(() => {
    const qs = q || {};
    return (assets || []).map(a => {
      const sym = a.symbol;
      const bid = qs[sym]?.bid ?? 0;
      const ask = qs[sym]?.ask ?? 0;
      // Simple mock signal based on random for now, or could use prev vs current price
      const signal = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'neutral';
      return { symbol: sym, name: a.name, bid, ask, signal };
    });
  }, [assets, q]);

  const activeInstrument = instruments.find(i => i.symbol === picked);

  const handleTrade = async (side: 'long' | 'short', margin: number, leverage: number) => {
    try {
      await trading.create({
        asset: picked,
        type: side,
        margin,
        leverage,
        slippage: 100
      });
      // Refresh orders immediately
      const { orders } = await ordersApi.open();
      setOpenOrders(mapOrders(orders));
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Trade failed");
    }
  };

  const handleCloseOrder = async (orderId: string) => {
    try {
      await trading.close(orderId);
      const [openRes, closedRes] = await Promise.all([
        ordersApi.open(),
        ordersApi.closed()
      ]);
      setOpenOrders(mapOrders(openRes.orders));
      setClosedOrders(mapClosedOrders(closedRes.orders));
    } catch (e: any) {
      alert(e?.message || "Failed to close order");
    }
  };

  if (loading) {
    return <div className="p-8 text-white/70">Loading terminal...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#181a20] overflow-hidden text-[#EAECEF]">
      {/* 1. Sidebar */}
      <Sidebar />

      {/* 2. Market Watch */}
      <MarketWatchPanel
        instruments={instruments}
        selected={picked}
        onSelect={(s) => setPicked(s as Sym)}
      />

      {/* 3. Main Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar / Header Replacement */}
        <div className="h-12 bg-[#181a20] border-b border-[#2a2e39] flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {/* Asset Tab */}
            <div className="flex bg-[#0d0f13] rounded-t-lg overflow-hidden">
              <button className="px-4 py-2 bg-[#2a2e39] text-white text-xs font-bold border-t-2 border-yellow-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                {picked}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-400">Demo Account</div>
              <div className="text-sm font-bold font-mono">10,000.00 USD</div>
            </div>
            <button className="bg-[#EAB308] hover:bg-yellow-500 text-black text-xs font-bold px-4 py-2 rounded">
              Deposit
            </button>
          </div>
        </div>

        {/* Chart Area - takes remaining space after BottomPanel */}
        <div className="flex-1 relative bg-[#131722] min-h-0 overflow-hidden">
          {/* One-Click Trading Overlay */}
          {activeInstrument && (
            <OneClickOverlay
              symbol={picked}
              bid={activeInstrument.bid}
              ask={activeInstrument.ask}
              onTrade={handleTrade}
            />
          )}

          {/* Timeframe Toolbar */}
          <div className="absolute top-3 left-3 flex gap-1 z-10 bg-[#1a1d24] border border-[#2a2e39] rounded p-0.5">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[10px] rounded-sm transition-colors ${timeframe === tf
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]'
                  }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <ChartPanel asset={picked} height={600} interval={timeframe} />
        </div>

        {/* Bottom Panel */}
        <BottomPanel
          openOrders={openOrders}
          closedOrders={closedOrders}
          onCloseOrder={handleCloseOrder}
          equity={1000000} // Mock values for now, would come from engine
          balance={1000000}
          freeMargin={1000000}
          margin={0}
          marginLevel={0}
        />
      </div>
    </div>
  );
}
