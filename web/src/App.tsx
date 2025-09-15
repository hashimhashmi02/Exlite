import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { api, trading, type Me } from "./lib/api";
import Trade from "./pages/Trade";
import History from "./pages/History";
import SignIn from "./pages/SignIn";

function TopBar({ me, balance }: { me: Me | null; balance: number | null }) {
  const app = import.meta.env.VITE_APP_NAME || "Exlite";
  return (
    <div className="px-4 h-14 flex items-center justify-between bg-black/20 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-yellow-400 text-black grid place-items-center font-bold">E</div>
        <Link to="/" className="font-semibold">{app}</Link>
        <Link to="/" className="ml-4 text-white/80 hover:text-white">Trade</Link>
        <Link to="/history" className="ml-3 text-white/80 hover:text-white">History</Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-white/80">{balance != null ? `$${balance.toLocaleString()}` : "—"}</div>
        <div className="text-white/60">{me?.email ?? ""}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const loc = useLocation();

  // session check (also when ?signedIn=1 present after magic link)
  useEffect(() => {
    (async () => {
      try {
        const m = await api.me();
        if (m.authenticated) setMe(m);
        else setMe({ authenticated: false });
      } catch {
        setMe({ authenticated: false });
      }
    })();
  }, [loc.search]);

  useEffect(() => {
    if (!me?.authenticated) return;
    let stop = false;
    const loop = async () => {
      try { const b = await trading.balanceUsd(); setBalance(b.balance); } catch {}
      if (!stop) setTimeout(loop, 4000);
    };
    loop();
    return () => { stop = true; };
  }, [me?.authenticated]);

  if (!me || !("authenticated" in me)) return null;
  if (!me.authenticated) return <SignIn />;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar me={me} balance={balance} />
      <Routes>
        <Route path="/" element={<Trade />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Trade />} />
      </Routes>
    </div>
  );
}
