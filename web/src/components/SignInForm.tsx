import { useState } from 'react';
import { api } from '../lib/api';

export default function SignInForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    try {
      await api.signin(email);
      setMsg('Magic link sent. (Dev mode: link console me print hota hai)');
      onSent();
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-3">
      <input
        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button
        className="w-full bg-black text-white rounded-lg px-3 py-2 disabled:opacity-60"
        disabled={busy}
      >
        {busy ? 'Sending…' : 'Send magic link'}
      </button>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <p className="text-xs text-gray-500">
        Dev note: Backend console me link open karna (cookie set hoke frontend par redirect).
      </p>
    </form>
  );
}
