import { Wallet } from "lucide-react";
type Tab = { symbol: string; onClick(): void; active: boolean };
export default function TopBar({ email, tabs }:{email?:string; tabs:Tab[]}) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-black/30 border-b border-white/10">
      <div className="px-3 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-yellow-400 grid place-items-center"><Wallet className="size-4 text-black"/></div>
          <span className="font-semibold tracking-wide">Exlite</span>
          <nav className="ml-4 hidden md:flex items-center gap-2">
            {tabs.map(t=>(
              <button key={t.symbol} onClick={t.onClick}
                className={`px-3 py-1.5 rounded-full text-sm border transition
                  ${t.active?'bg-white text-black border-transparent':'border-white/15 hover:bg-white/10'}`}>
                {t.symbol}
              </button>
            ))}
          </nav>
        </div>
        <div className="text-xs text-white/70">{email}</div>
      </div>
    </header>
  );
}
