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
        const res = await api.exchangeMagic(token);
        if (res.token) localStorage.setItem("token", res.token);
        nav("/trade", { replace: true });
      } catch (e: any) {
        setMsg(e?.message || "Magic link invalid or expired.");
      }
    })();
  }, [loc.search, nav]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-white/80">{msg}</div>
    </div>
  );
}
