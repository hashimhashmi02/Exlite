import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: any }> {
  state = { error: undefined as any };
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(err: any) { console.error("UI error", err); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <h1 className="text-3xl text-red-400 font-semibold mb-6">Something broke</h1>
          <pre className="text-red-300 text-lg whitespace-pre-wrap mb-4">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          {this.state.error?.stack && (
            <pre className="text-red-300 text-sm whitespace-pre-wrap opacity-70">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
