import { useState } from 'react';

type OrderTab = 'open' | 'pending' | 'closed';

type OpenOrder = {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    margin: number;
    leverage: number;
    entryPrice: number;
    pnl?: number;
};

type ClosedOrder = {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    margin: number;
    leverage: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
};

type Props = {
    openOrders: OpenOrder[];
    closedOrders?: ClosedOrder[];
    equity: number;
    balance: number;
    freeMargin: number;
    margin: number;
    marginLevel?: number;
    onCloseOrder?: (orderId: string) => void;
};

export default function BottomPanel({
    openOrders,
    closedOrders = [],
    equity,
    balance,
    freeMargin,
    margin,
    marginLevel,
    onCloseOrder
}: Props) {
    const [activeTab, setActiveTab] = useState<OrderTab>('open');
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`bg-[#0d0f13] border-t border-[#2a2e39] transition-all flex flex-col flex-shrink-0 ${collapsed ? 'h-10' : 'h-64'}`}>
            {/* Tabs Row */}
            <div className="flex items-center justify-between border-b border-[#2a2e39] h-10 flex-shrink-0">
                <div className="flex items-center">
                    {(['open', 'pending', 'closed'] as OrderTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${activeTab === tab
                                ? 'text-white border-b-2 border-yellow-500'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 px-3">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1 text-gray-500 hover:text-white"
                    >
                        <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            {!collapsed && (
                <>
                    <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
                        {activeTab === 'open' && openOrders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm">No open positions</span>
                            </div>
                        )}
                        {activeTab === 'open' && openOrders.length > 0 && (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-1 font-medium">Symbol</th>
                                        <th className="py-1 font-medium">Side</th>
                                        <th className="py-1 font-medium text-right">Margin</th>
                                        <th className="py-1 font-medium text-right">Leverage</th>
                                        <th className="py-1 font-medium text-right">Entry</th>
                                        <th className="py-1 font-medium text-right">P/L</th>
                                        <th className="py-1"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openOrders.map((order) => (
                                        <tr key={order.id} className="text-white hover:bg-[#1a1d24]">
                                            <td className="py-1.5 font-medium">{order.symbol}</td>
                                            <td className={`py-1.5 ${order.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                                                {order.side.toUpperCase()}
                                            </td>
                                            <td className="py-1.5 text-right font-mono">${(order.margin / 100).toFixed(2)}</td>
                                            <td className="py-1.5 text-right">{order.leverage}x</td>
                                            <td className="py-1.5 text-right font-mono">{order.entryPrice.toLocaleString()}</td>
                                            <td className={`py-1.5 text-right font-mono ${(order.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {(order.pnl ?? 0) >= 0 ? '+' : ''}{((order.pnl ?? 0) / 100).toFixed(2)}
                                            </td>
                                            <td className="py-1.5 text-right">
                                                <button
                                                    onClick={() => onCloseOrder?.(order.id)}
                                                    className="text-gray-500 hover:text-red-400"
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {activeTab === 'closed' && closedOrders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm">No closed positions</span>
                            </div>
                        )}
                        {activeTab === 'closed' && closedOrders.length > 0 && (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-1 font-medium">Symbol</th>
                                        <th className="py-1 font-medium">Side</th>
                                        <th className="py-1 font-medium text-right">Margin</th>
                                        <th className="py-1 font-medium text-right">Leverage</th>
                                        <th className="py-1 font-medium text-right">Entry</th>
                                        <th className="py-1 font-medium text-right">Exit</th>
                                        <th className="py-1 font-medium text-right">P/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {closedOrders.map((order) => (
                                        <tr key={order.id} className="text-white hover:bg-[#1a1d24]">
                                            <td className="py-1.5 font-medium">{order.symbol}</td>
                                            <td className={`py-1.5 ${order.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                                                {order.side.toUpperCase()}
                                            </td>
                                            <td className="py-1.5 text-right font-mono">${(order.margin / 100).toFixed(2)}</td>
                                            <td className="py-1.5 text-right">{order.leverage}x</td>
                                            <td className="py-1.5 text-right font-mono">{order.entryPrice.toLocaleString()}</td>
                                            <td className="py-1.5 text-right font-mono">{order.exitPrice.toLocaleString()}</td>
                                            <td className={`py-1.5 text-right font-mono ${order.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {order.pnl >= 0 ? '+' : ''}{(order.pnl / 100).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 px-4 py-2 border-t border-[#2a2e39] text-xs">
                        <div>
                            <span className="text-gray-500">Equity: </span>
                            <span className="text-white font-mono">{(equity / 100).toFixed(2)} USD</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Free Margin: </span>
                            <span className="text-white font-mono">{(freeMargin / 100).toFixed(2)} USD</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Balance: </span>
                            <span className="text-white font-mono">{(balance / 100).toFixed(2)} USD</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Margin: </span>
                            <span className="text-white font-mono">{(margin / 100).toFixed(2)} USD</span>
                        </div>
                        {marginLevel !== undefined && (
                            <div>
                                <span className="text-gray-500">Margin level: </span>
                                <span className="text-white font-mono">{marginLevel.toFixed(2)}%</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
