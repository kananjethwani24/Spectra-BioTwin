"use client";
import type { TwinState, Scenario, Timeline, PredictionResult } from "@/hooks/useTwinState";

const SCENARIOS: { id: Scenario; label: string; icon: string; color: string; desc: string }[] = [
  { id: "none",        label: "Baseline",    icon: "🧬", color: "cyan",    desc: "Resting physiological state" },
  { id: "exercise",    label: "Exercise",    icon: "🏃", color: "emerald", desc: "Moderate aerobic load" },
  { id: "fever",       label: "Fever",       icon: "🌡️", color: "amber",   desc: "Pyrexia cascade simulation" },
  { id: "low_oxygen",  label: "Low O₂ Env",  icon: "🫁", color: "red",     desc: "Hypoxic environment exposure" },
  { id: "drug_admin",  label: "Drug Admin",  icon: "💊", color: "purple",  desc: "Beta-blocker administration" },
  { id: "dehydration", label: "Dehydration", icon: "💧", color: "orange",  desc: "Fluid deficit progression" },
];

const TIMELINES: { id: Timeline; label: string }[] = [
  { id: "1h",  label: "1 Hour"  },
  { id: "6h",  label: "6 Hours" },
  { id: "12h", label: "12 Hours" },
  { id: "24h", label: "24 Hours" },
];

const borderMap: Record<string, string> = {
  cyan: "border-cyan-500/50", emerald: "border-emerald-500/50",
  amber: "border-amber-500/50", red: "border-red-500/50",
  purple: "border-purple-500/50", orange: "border-orange-500/50",
};
const bgMap: Record<string, string> = {
  cyan: "bg-cyan-50", emerald: "bg-emerald-50",
  amber: "bg-amber-50", red: "bg-red-50",
  purple: "bg-purple-50", orange: "bg-orange-50",
};
const textMap: Record<string, string> = {
  cyan: "text-cyan-600", emerald: "text-emerald-600",
  amber: "text-amber-600", red: "text-red-600",
  purple: "text-purple-600", orange: "text-orange-600",
};

function riskColor(v: number) { return v >= 70 ? "#ef4444" : v >= 40 ? "#f59e0b" : "#10b981"; }
function scoreColor(v: number) { return v >= 70 ? "#10b981" : v >= 40 ? "#f59e0b" : "#ef4444"; }
function deltaColor(d: number) { return d > 5 ? "#ef4444" : d > 0 ? "#f59e0b" : "#10b981"; }

function StateCard({ label, icon, current, predicted, unit, colorFn, decimals = 0 }: {
  label: string; icon: string; current: number; predicted: number;
  unit: string; colorFn: (v: number) => string; decimals?: number;
}) {
  const delta = predicted - current;
  return (
    <div className="glass-card p-4 flex flex-col gap-2 transition-all duration-500 ease-in-out" style={{ border: "1px solid var(--border-color)" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--text-muted)" }}>{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 2 }}>Current</div>
        <span className="text-xl font-black font-mono" style={{ color: colorFn(current) }}>
          {current.toFixed(decimals)}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>{unit}</span>
      </div>
      <div>
        <div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 2 }}>Predicted</div>
        <span className="text-xl font-black font-mono" style={{ color: colorFn(predicted) }}>
          {predicted.toFixed(decimals)}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: deltaColor(delta) }}>
        {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)} ${unit}`}
      </div>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginTop: 12 }}>
      <div style={{ height: "100%", borderRadius: 4, background: color, width: `${value}%`, transition: "width 0.7s" }} />
    </div>
  );
}

type Props = {
  twinState: TwinState;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  timeline: Timeline;
  setTimeline: (t: Timeline) => void;
  prediction: PredictionResult;
};

export default function TwinSandbox({ twinState, scenario, setScenario, timeline, setTimeline, prediction }: Props) {
  const { predicted, risk_delta, confidence, warnings } = prediction;

  return (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.4em", color: "var(--text-muted)" }}>Intervention Simulator</h3>
          <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>Scenario-based physiological prediction engine</p>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "var(--accent-cyan)" }}>Twin Active</span>
        </div>
      </div>

      {/* Scenario */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.3em", color: "var(--text-muted)", marginBottom: 12 }}>Scenario Controls</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {SCENARIOS.map((s) => {
            const active = scenario === s.id;
            return (
              <button key={s.id} onClick={() => setScenario(s.id)}
                className={`glass-card p-3 text-left transition-all border ${active ? `${borderMap[s.color]} ${bgMap[s.color]}` : "border-slate-200 hover:border-slate-300 bg-white/60"}`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: active ? "" : "var(--text-secondary)" }}
                  className={active ? textMap[s.color] : ""}>{s.label}</div>
                <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.3em", color: "var(--text-muted)", marginBottom: 12 }}>Simulation Timeline</div>
        <div className="flex gap-3">
          {TIMELINES.map((t) => (
            <button key={t.id} onClick={() => setTimeline(t.id)}
              style={{
                padding: "10px 24px", borderRadius: 12, fontSize: 10, fontWeight: 800,
                textTransform: "uppercase" as const, letterSpacing: "0.12em", cursor: "pointer",
                transition: "all 0.2s",
                background: timeline === t.id ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.7)",
                color: timeline === t.id ? "var(--accent-cyan)" : "var(--text-muted)",
                border: `1px solid ${timeline === t.id ? "rgba(6,182,212,0.4)" : "rgba(0,0,0,0.08)"}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* State vars — 2 rows */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.3em", color: "var(--text-muted)", marginBottom: 12 }}>State Variables — Current vs Predicted</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <StateCard label="Heart Rate"   icon="❤️"  current={twinState.heartRate}         predicted={predicted.heartRate}         unit="bpm" colorFn={(v) => v > 100 || v < 50 ? "#ef4444" : "#0891b2"} decimals={0} />
          <StateCard label="SpO₂"         icon="🩸"  current={twinState.spo2}               predicted={predicted.spo2}               unit="%"   colorFn={(v) => v < 90 ? "#ef4444" : v < 95 ? "#f59e0b" : "#10b981"} decimals={1} />
          <StateCard label="Temperature"  icon="🌡️" current={twinState.temperature}        predicted={predicted.temperature}        unit="°C"  colorFn={(v) => v > 38.5 ? "#ef4444" : v > 37.5 ? "#f59e0b" : "#0891b2"} decimals={1} />
          <StateCard label="Stress Index" icon="⚡"  current={twinState.stressIndex}        predicted={predicted.stressIndex}        unit=""    colorFn={riskColor}  decimals={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StateCard label="Cardiac Risk"  icon="🫀" current={twinState.cardiacRisk}        predicted={predicted.cardiacRisk}        unit=""    colorFn={riskColor}  decimals={0} />
          <StateCard label="Resp. Health"  icon="🫁" current={twinState.respiratoryHealth}   predicted={predicted.respiratoryHealth}   unit=""    colorFn={scoreColor} decimals={0} />
          <StateCard label="Recovery"      icon="💪" current={twinState.recoveryScore}       predicted={predicted.recoveryScore}       unit=""    colorFn={scoreColor} decimals={0} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5" style={{ borderLeft: "4px solid rgba(6,182,212,0.5)", border: "1px solid var(--border-color)", borderLeftWidth: 4, borderLeftColor: "rgba(6,182,212,0.5)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 8 }}>Risk Delta</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono" style={{ color: deltaColor(risk_delta) }}>
              {risk_delta > 0 ? "+" : ""}{risk_delta.toFixed(1)}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" as const }}>pts cardiac risk</span>
          </div>
          <ProgressBar value={Math.min(100, Math.abs(risk_delta) * 2)} color={deltaColor(risk_delta)} />
        </div>

        <div className="glass-card p-5" style={{ borderLeft: "4px solid rgba(168,85,247,0.5)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 8 }}>Confidence Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono" style={{ color: "#a855f7" }}>{confidence}%</span>
          </div>
          <ProgressBar value={confidence} color="#a855f7" />
        </div>

        <div className="glass-card p-5" style={{ borderLeft: "4px solid rgba(245,158,11,0.5)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 8 }}>Predicted Warnings</div>
          {warnings.length === 0 ? (
            <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 8 }}>No risk factors predicted</div>
          ) : (
            <ul className="flex flex-col gap-1.5 mt-1">
              {warnings.map((w: string, i: number) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 9, color: "#d97706" }}>
                  <span style={{ color: "#f59e0b", marginTop: 1 }}>⚠</span>{w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
