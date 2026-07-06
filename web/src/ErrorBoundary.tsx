import React, { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[HatchFi UI]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="layout" style={{ paddingTop: 48 }}>
          <h1 style={{ fontFamily: "var(--serif)", marginBottom: 8 }}>UI error</h1>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            The page hit a runtime error. Hard-refresh (Cmd+Shift+R) or restart{" "}
            <code>npm run web:dev</code>.
          </p>
          <pre
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              overflow: "auto",
              fontSize: 13,
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: 16 }}>
            <a href="#/" style={{ color: "var(--mint)" }}>
              ← Back to Operator Console
            </a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
