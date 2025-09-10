import { useEffect, useState } from "react";
import { api, type Asset, type Me } from "./lib/api";
import SignInForm from "./components/SignInForm";
import Shell from "./layouts/Shell";
import TopBar from "./components/TopBar";
import Instruments from "./components/Instruments";
import ChartPanel from "./components/ChartPanel";
import TradePanel from "./components/TradePanel";

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("signedIn") === "1") {
        url.searchParams.delete("signedIn");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      try {
        const m = await api.me();
        setMe(m);
        if (m.authenticated) {
          const { assets } = await api.supportedAssets();
          setAssets(assets);
          if (assets[0]) setPicked(assets[0].symbol);
        }
      } catch {
        setMe({ authenticated: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="h-full grid place-items-center"><div className="animate-pulse text-white/70">Loading…</div></div>;
  }

  if (!me?.authenticated) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-3xl font-semibold">Welcome to Exlite</h1>
          <p className="text-white/70">Enter your email to get a magic link (dev mode: backend console).</p>
          <SignInForm onSent={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <Shell
      top={<TopBar email={me.email} tabs={assets.map(a => ({ symbol: a.symbol, active: a.symbol===picked, onClick: () => setPicked(a.symbol) }))} />}
      left={<Instruments assets={assets} onPick={setPicked} picked={picked ?? undefined} />}
      center={<ChartPanel asset={picked} />}
      right={<TradePanel asset={picked} />}
    />
  );
}
