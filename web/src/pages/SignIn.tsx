import { useState } from "react";
import { api } from "../lib/api";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setMsg(null); setDevLink(null); setLoading(true);
    try {
      const r = await api.signin(email.trim()); 
      if ((r as any).magicUrl) {
        setMsg("Magic link created (dev). Click the link below or check your email.");
        setDevLink((r as any).magicUrl);
      } else {
        setMsg("Magic link sent! Check your email.");
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">
          Welcome to {import.meta.env.VITE_APP_NAME || "Exlite"}
        </h1>
        <p className="text-white/70 mb-8">Enter your email to get a magic link.</p>

        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white text-black placeholder:text-black/60 px-4 py-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={send}
          disabled={loading || !email}
          className="mt-3 w-full rounded-xl bg-black text-white py-3 border border-white/10 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>

        {msg && <div className="mt-3 text-red-400">{msg}</div>}
        {devLink && (
          <div className="mt-3">
            <a className="underline text-blue-300 break-all" href={devLink}>
              {devLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
