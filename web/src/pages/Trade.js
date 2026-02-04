import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api, quotes as quoteApi, trading, orders as ordersApi } from "../lib/api";
import ChartPanel from "../components/ChartPanel";
import Sidebar from "../components/Sidebar";
import MarketWatchPanel from "../components/MarketWatchPanel";
import OneClickOverlay from "../components/OneClickOverlay";
import BottomPanel from "../components/BottomPanel";
export default function Trade() {
    const [assets, setAssets] = useState([]);
    const [picked, setPicked] = useState("BTC");
    const [q, setQ] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openOrders, setOpenOrders] = useState([]);
    const [closedOrders, setClosedOrders] = useState([]);
    const [timeframe, setTimeframe] = useState('1m');
    // Initial asset load
    useEffect(() => {
        let dead = false;
        (async () => {
            try {
                const r = await api.supportedAssets();
                if (dead)
                    return;
                setAssets(r?.assets ?? []);
                // Load initial orders
                const { orders } = await ordersApi.open();
                setOpenOrders(mapOrders(orders));
                // Load closed orders
                const { orders: closed } = await ordersApi.closed();
                setClosedOrders(mapClosedOrders(closed));
            }
            catch {
                if (dead)
                    return;
                setAssets([]);
            }
            finally {
                if (!dead)
                    setLoading(false);
            }
        })();
        return () => { dead = true; };
    }, []);
    // Poll quotes
    useEffect(() => {
        if (!assets || assets.length === 0)
            return;
        let stop = false;
        const syms = assets.map(a => a.symbol).filter(Boolean);
        const loop = async () => {
            try {
                const r = await quoteApi.get(syms);
                if (!stop)
                    setQ(Object.fromEntries(Object.entries(r.quotes || {}).map(([k, v]) => [k, { bid: v?.bid ?? 0, ask: v?.ask ?? 0 }])));
            }
            catch {
                if (!stop)
                    setQ(null);
            }
            if (!stop)
                setTimeout(loop, 1500);
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
            }
            catch { }
            if (!stop)
                setTimeout(loop, 2000);
        };
        loop();
        return () => { stop = true; };
    }, []);
    // Helper to map API DTO to UI format
    const mapOrders = (dtos) => {
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
    const mapClosedOrders = (dtos) => {
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
    const instruments = useMemo(() => {
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
    const handleTrade = async (side, margin, leverage) => {
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
        }
        catch (e) {
            console.error(e);
            alert(e?.message || "Trade failed");
        }
    };
    const handleCloseOrder = async (orderId) => {
        try {
            await trading.close(orderId);
            const [openRes, closedRes] = await Promise.all([
                ordersApi.open(),
                ordersApi.closed()
            ]);
            setOpenOrders(mapOrders(openRes.orders));
            setClosedOrders(mapClosedOrders(closedRes.orders));
        }
        catch (e) {
            alert(e?.message || "Failed to close order");
        }
    };
    if (loading) {
        return _jsx("div", { className: "p-8 text-white/70", children: "Loading terminal..." });
    }
    return (_jsxs("div", { className: "flex h-screen w-full bg-[#181a20] overflow-hidden text-[#EAECEF]", children: [_jsx(Sidebar, {}), _jsx(MarketWatchPanel, { instruments: instruments, selected: picked, onSelect: (s) => setPicked(s) }), _jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [_jsxs("div", { className: "h-12 bg-[#181a20] border-b border-[#2a2e39] flex items-center justify-between px-4", children: [_jsx("div", { className: "flex items-center gap-4", children: _jsx("div", { className: "flex bg-[#0d0f13] rounded-t-lg overflow-hidden", children: _jsxs("button", { className: "px-4 py-2 bg-[#2a2e39] text-white text-xs font-bold border-t-2 border-yellow-500 flex items-center gap-2", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-yellow-500" }), picked] }) }) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-[10px] text-gray-400", children: "Demo Account" }), _jsx("div", { className: "text-sm font-bold font-mono", children: "10,000.00 USD" })] }), _jsx("button", { className: "bg-[#EAB308] hover:bg-yellow-500 text-black text-xs font-bold px-4 py-2 rounded", children: "Deposit" })] })] }), _jsxs("div", { className: "flex-1 relative bg-[#131722] min-h-0 overflow-hidden", children: [activeInstrument && (_jsx(OneClickOverlay, { symbol: picked, bid: activeInstrument.bid, ask: activeInstrument.ask, onTrade: handleTrade })), _jsx("div", { className: "absolute top-3 left-3 flex gap-1 z-10 bg-[#1a1d24] border border-[#2a2e39] rounded p-0.5", children: ['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (_jsx("button", { onClick: () => setTimeframe(tf), className: `px-2.5 py-1 text-[10px] rounded-sm transition-colors ${timeframe === tf
                                        ? 'bg-yellow-500 text-black font-bold'
                                        : 'text-gray-400 hover:text-white hover:bg-[#2a2e39]'}`, children: tf.toUpperCase() }, tf))) }), _jsx(ChartPanel, { asset: picked, height: 600, interval: timeframe })] }), _jsx(BottomPanel, { openOrders: openOrders, closedOrders: closedOrders, onCloseOrder: handleCloseOrder, equity: 1000000, balance: 1000000, freeMargin: 1000000, margin: 0, marginLevel: 0 })] })] }));
}
