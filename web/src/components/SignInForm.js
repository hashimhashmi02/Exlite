import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../lib/api';
export default function SignInForm({ onSent }) {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);
    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        setMsg(null);
        try {
            await api.signin(email);
            setMsg('Magic link sent. (Dev mode: link console me print hota hai)');
            onSent();
        }
        catch (e) {
            setErr(e?.message || 'Failed');
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit, className: "max-w-sm w-full space-y-3", children: [_jsx("input", { className: "w-full border rounded-lg px-3 py-2 outline-none focus:ring", type: "email", placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx("button", { className: "w-full bg-black text-white rounded-lg px-3 py-2 disabled:opacity-60", disabled: busy, children: busy ? 'Sending…' : 'Send magic link' }), msg && _jsx("p", { className: "text-green-600 text-sm", children: msg }), err && _jsx("p", { className: "text-red-600 text-sm", children: err }), _jsx("p", { className: "text-xs text-gray-500", children: "Dev note: Backend console me link open karna (cookie set hoke frontend par redirect)." })] }));
}
