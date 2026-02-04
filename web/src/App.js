import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { api, trading } from "./lib/api";
import Trade from "./pages/Trade";
import History from "./pages/History";
import SignIn from "./pages/SignIn";
import Magic from "./pages/Magic";
function TopBar({ me, balance }) {
    const app = import.meta.env.VITE_APP_NAME || "Exlite";
    const handleSignOut = async () => {
        try {
            await api.logout();
        }
        catch (e) {
            console.error('Logout failed:', e);
        }
        window.location.href = '/';
    };
    return (_jsxs("div", { className: "px-4 h-14 flex items-center justify-between bg-black/20 border-b border-white/10", children: [_jsxs("div", { className: "flex items-center gap-6", children: [_jsx(Link, { to: "/", className: "font-bold text-xl tracking-tight", style: {
                            background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 2px 4px rgba(255, 165, 0, 0.3)',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                        }, children: app }), _jsx(Link, { to: "/history", className: "text-white/80 hover:text-white", children: "History" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "text-white/80", children: balance != null ? `$${balance.toLocaleString()}` : "—" }), _jsx("div", { className: "text-white/60", children: me?.email ?? "" }), _jsx("button", { onClick: handleSignOut, className: "text-white/60 hover:text-red-400 transition-colors text-sm", children: "Sign Out" })] })] }));
}
function AuthedShell({ me }) {
    const [balance, setBalance] = useState(null);
    useEffect(() => {
        let stop = false;
        const loop = async () => {
            try {
                const b = await trading.balanceUsd();
                setBalance(b.balance);
            }
            catch { }
            if (!stop)
                setTimeout(loop, 4000);
        };
        loop();
        return () => { stop = true; };
    }, []);
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx(TopBar, { me: me, balance: balance }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Trade, {}) }), _jsx(Route, { path: "/trade", element: _jsx(Trade, {}) }), _jsx(Route, { path: "/history", element: _jsx(History, {}) }), _jsx(Route, { path: "*", element: _jsx(Trade, {}) })] })] }));
}
export default function App() {
    const [me, setMe] = useState(null);
    const [auth, setAuth] = useState("loading");
    const loc = useLocation();
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const m = await api.me();
                if (!mounted)
                    return;
                if (m?.authenticated) {
                    setMe(m);
                    setAuth("authed");
                }
                else {
                    setMe({ authenticated: false });
                    setAuth("anon");
                }
            }
            catch {
                if (!mounted)
                    return;
                setMe({ authenticated: false });
                setAuth("anon");
            }
        })();
        return () => { mounted = false; };
    }, [loc.key]);
    if (loc.pathname === "/magic")
        return _jsx(Magic, {});
    if (auth === "loading") {
        return (_jsx("div", { className: "min-h-screen grid place-items-center", children: _jsx("div", { className: "text-white/70", children: "Loading\u2026" }) }));
    }
    if (auth === "anon")
        return _jsx(SignIn, {});
    return _jsx(AuthedShell, { me: me });
}
