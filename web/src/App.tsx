import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { api, trading, type Me } from "./lib/api";
import Trade from "./pages/Trade";
import History from "./pages/History";
import SignIn from "./pages/SignIn";
import Magic from "./pages/Magic";

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

function AuthedShell({ me }: { me: Me }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    const loop = async () => {
      try {
        const b = await trading.balanceUsd();
        setBalance(b.balance);
      } catch {}
      if (!stop) setTimeout(loop, 4000);
    };
    loop();
    return () => { stop = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar me={me} balance={balance} />
      <Routes>
        <Route path="/" element={<Trade />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Trade />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [auth, setAuth] = useState<"loading" | "authed" | "anon">("loading");
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await api.me();
        if (!mounted) return;
        if (m?.authenticated) {
          setMe(m);
          setAuth("authed");
        } else {
          setMe({ authenticated: false });
          setAuth("anon");
        }
      } catch {
        if (!mounted) return;
        setMe({ authenticated: false });
        setAuth("anon");
      }
    })();
    return () => { mounted = false; };
  }, [loc.key]); // re-check on navigation

  // Always allow the token exchange page
  if (loc.pathname === "/magic") return <Magic />;

  // Loading state – show a visible spinner, never blank.
  if (auth === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-white/70">Loading…</div>
      </div>
    );
  }

  // Not authenticated – show SignIn regardless of route
  if (auth === "anon") return <SignIn />;

  // Authenticated shell
  return <AuthedShell me={me!} />;
}
