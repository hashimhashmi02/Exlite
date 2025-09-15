import { useEffect, useState } from "react";
import { orders } from "../lib/api";
const usd = (n:number)=>`$${n.toLocaleString(undefined,{maximumFractionDigits:2})}`;

export default function ClosedOrders(){
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{ (async()=>{ try{ const {orders:os}=await orders.closed(); setRows(os);}catch{} })(); },[]);
  return (
    <div className="mt-4">
      <h3 className="text-sm uppercase tracking-wider text-white/60 mb-2">Closed</h3>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Exit</th>
              <th className="px-3 py-2 text-right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && (<tr><td colSpan={6} className="px-3 py-4 text-white/60">No history yet.</td></tr>)}
            {rows.map((r:any)=>(
              <tr key={r.orderId} className="border-t border-white/10">
                <td className="px-3 py-2 font-medium">{r.asset}</td>
                <td className="px-3 py-2">{r.side}</td>
                <td className="px-3 py-2 text-right">{usd(Number(r.marginCents)/100)}</td>
                <td className="px-3 py-2 text-right">{(Number(r.entryPrice)/10**r.assetDecimals).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{(Number(r.exitPrice)/10**r.assetDecimals).toLocaleString()}</td>
                <td className={`px-3 py-2 text-right ${Number(r.pnlCents)>=0?'text-green-400':'text-red-400'}`}>
                  {usd(Number(r.pnlCents)/100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
