import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { error: undefined };
    }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(err) { console.error("UI error", err); }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { className: "p-8", children: [_jsx("h1", { className: "text-3xl text-red-400 font-semibold mb-6", children: "Something broke" }), _jsx("pre", { className: "text-red-300 text-lg whitespace-pre-wrap mb-4", children: String(this.state.error?.message || this.state.error) }), this.state.error?.stack && (_jsx("pre", { className: "text-red-300 text-sm whitespace-pre-wrap opacity-70", children: this.state.error.stack }))] }));
        }
        return this.props.children;
    }
}
