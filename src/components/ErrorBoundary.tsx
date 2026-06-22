"use client";
import React from "react";

type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#010204", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 24, padding: 40,
        }}>
          <div style={{ fontSize: 32 }}>💥</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Runtime Error
          </div>
          <div style={{
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 12, padding: "16px 24px", maxWidth: 800, width: "100%",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>
              {this.state.error.name}: {this.state.error.message}
            </div>
            <pre style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
