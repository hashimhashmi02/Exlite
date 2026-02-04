import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
export default function Magic() {
    const nav = useNavigate();
    const loc = useLocation();
    const [msg, setMsg] = useState("Signing you in…");
    useEffect(() => {
        const token = new URLSearchParams(loc.search).get("token") || "";
        (async () => {
            try {
                await api.exchangeMagic(token);
                nav("/trade", { replace: true });
            }
            catch (e) {
                setMsg(e?.message || "Magic link invalid or expired.");
            }
        })();
    }, [loc.search, nav]);
    return (_jsx("div", { className: "min-h-screen grid place-items-center px-4", children: _jsx("div", { className: "text-white/80", children: msg }) }));
}
