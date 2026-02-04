import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { api } from "../lib/api";
// Floating crypto icon component
function FloatingIcon({ symbol, delay, size, left, top }) {
    return (_jsx("div", { className: "absolute text-yellow-500/20 font-bold select-none pointer-events-none", style: {
            left,
            top,
            fontSize: `${size}rem`,
            animation: `float ${6 + delay}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
        }, children: symbol }));
}
export default function SignIn() {
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState(null);
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    async function send() {
        setMsg(null);
        setLoading(true);
        try {
            await api.signin(email.trim());
            setSent(true);
            setMsg("Magic link sent! Check your email inbox.");
        }
        catch (e) {
            setMsg(e?.message || "Failed to send");
        }
        finally {
            setLoading(false);
        }
    }
    const appName = import.meta.env.VITE_APP_NAME || "Exlite";
    return (_jsxs("div", { className: "min-h-screen flex relative overflow-hidden bg-[#0a0b0f]", children: [_jsx("div", { className: "absolute inset-0 opacity-40", style: {
                    background: 'radial-gradient(ellipse at 20% 20%, rgba(255, 193, 7, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 152, 0, 0.1) 0%, transparent 50%)',
                } }), _jsx(FloatingIcon, { symbol: "\u20BF", delay: 0, size: 4, left: "10%", top: "20%" }), _jsx(FloatingIcon, { symbol: "\u039E", delay: 1.5, size: 3, left: "80%", top: "15%" }), _jsx(FloatingIcon, { symbol: "\u25CE", delay: 3, size: 2.5, left: "15%", top: "70%" }), _jsx(FloatingIcon, { symbol: "\u20BF", delay: 2, size: 2, left: "75%", top: "60%" }), _jsx(FloatingIcon, { symbol: "\u039E", delay: 4, size: 3.5, left: "60%", top: "80%" }), _jsx(FloatingIcon, { symbol: "\u25CE", delay: 1, size: 2, left: "30%", top: "40%" }), _jsx(FloatingIcon, { symbol: "$", delay: 2.5, size: 3, left: "85%", top: "35%" }), _jsx(FloatingIcon, { symbol: "$", delay: 0.5, size: 2.5, left: "5%", top: "50%" }), _jsx("div", { className: "flex-1 flex items-center justify-center relative z-10 px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "rounded-3xl p-8 backdrop-blur-xl border border-white/10", style: {
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                            }, children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold mb-2", style: {
                                                background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                filter: 'drop-shadow(0 2px 4px rgba(255,165,0,0.3))',
                                            }, children: appName }), _jsx("p", { className: "text-white/50 text-sm", children: "Professional Trading Platform" })] }), !sent ? (_jsxs(_Fragment, { children: [_jsx("h2", { className: "text-xl font-semibold text-white mb-2", children: "Welcome back" }), _jsx("p", { className: "text-white/60 text-sm mb-6", children: "Enter your email to receive a secure sign-in link." }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-white/70 text-xs mb-2 uppercase tracking-wider", children: "Email Address" }), _jsx("input", { type: "email", placeholder: "you@example.com", className: "w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3.5 outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all", value: email, onChange: (e) => setEmail(e.target.value), onKeyDown: (e) => e.key === 'Enter' && email && send() })] }), _jsx("button", { onClick: send, disabled: loading || !email, className: "w-full rounded-xl py-3.5 font-semibold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed", style: {
                                                        background: loading
                                                            ? 'linear-gradient(135deg, #666 0%, #444 100%)'
                                                            : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                                                        boxShadow: loading ? 'none' : '0 4px 15px rgba(255, 165, 0, 0.3)',
                                                    }, children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsxs("svg", { className: "animate-spin h-5 w-5", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", fill: "none" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Sending..."] })) : ("Send Magic Link") })] }), msg && (_jsx("div", { className: "mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center", children: msg }))] })) : (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h2", { className: "text-xl font-semibold text-white mb-2", children: "Check your email" }), _jsxs("p", { className: "text-white/60 text-sm mb-4", children: ["We sent a magic link to", _jsx("br", {}), _jsx("span", { className: "text-white font-medium", children: email })] }), _jsx("button", { onClick: () => { setSent(false); setEmail(""); setMsg(null); }, className: "text-yellow-500 hover:text-yellow-400 text-sm underline", children: "Use a different email" })] }))] }), _jsx("p", { className: "text-center text-white/30 text-xs mt-6", children: "By signing in, you agree to our Terms of Service" })] }) }), _jsx("style", { children: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      ` })] }));
}
