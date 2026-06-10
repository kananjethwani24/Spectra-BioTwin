"use client";
import { useState, useEffect, useCallback } from "react";

type InsightData = {
  insights: string[];
  source: "gemini" | "rule-based" | "error";
};

export default function AIInsights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/insights");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      setData({ insights: ["Backend unavailable — start the Python server."], source: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  const sourceLabel = data?.source === "gemini" ? "Gemini 2.5" : data?.source === "rule-based" ? "Rule Engine" : "Error";
  const sourceBadgeColor = data?.source === "gemini" ? "#22d3ee" : data?.source === "rule-based" ? "#a78bfa" : "#f87171";

  return (
    <div style={{
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: "3px solid #22d3ee",
      borderRadius: 16,
      padding: "20px 24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.7)" }}>
            AI Insights
          </span>
          {data && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
              background: `${sourceBadgeColor}18`, color: sourceBadgeColor,
              border: `1px solid ${sourceBadgeColor}33`, textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {sourceLabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchInsights}
            disabled={loading}
            style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 10, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", border: "1px solid rgba(34,211,238,0.3)",
              background: "rgba(34,211,238,0.08)", color: "#22d3ee",
              opacity: loading ? 0.5 : 1, textTransform: "uppercase", letterSpacing: "0.08em",
            }}
          >
            {loading ? "Analyzing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Insights list */}
      {loading && !data ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          <span>⟳</span>
          Analyzing biosensor data...
        </div>
      ) : !(data?.insights?.length) ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>No insights yet.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {(data?.insights ?? []).map((insight, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#22d3ee",
                flexShrink: 0, marginTop: 6,
                boxShadow: "0 0 6px #22d3ee",
              }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                {insight}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
