"use client";
import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  RadialLinearScale, ArcElement, Filler, Tooltip, Legend, Title,
} from "chart.js";
import { Line, Radar } from "react-chartjs-2";
import type { TwinState, Scenario, PredictionResult } from "@/hooks/useTwinState";
import { computeScores, classifyCondition } from "@/hooks/useTwinState";
import { useSensor } from "@/context/SensorContext";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  RadialLinearScale, ArcElement, Filler, Tooltip, Legend, Title
);

// ── Types & constants ──────────────────────────────────────────────────────────

const TIMELINE_LABELS = ["Now", "5 min", "1 hr", "24 hr", "7 days"];
const TIMELINE_HOURS  = [0, 0.083, 1, 24, 168];

const SCENARIOS_ALL: { id: Scenario; label: string; color: string }[] = [
  { id: "none",        label: "Baseline",    color: "#22d3ee" },
  { id: "exercise",    label: "Exercise",    color: "#34d399" },
  { id: "drug_admin",  label: "Drug Admin",  color: "#c084fc" },
  { id: "low_oxygen",  label: "Low O₂",      color: "#f87171" },
  { id: "fever",       label: "Fever",       color: "#fbbf24" },
  { id: "dehydration", label: "Dehydration", color: "#fb923c" },
];

type EffectVector = {
  hr_rate: number; spo2_rate: number; temp_rate: number;
  stress_rate: number; cardiac_risk_rate: number;
  resp_health_rate: number; recovery_rate: number;
  confidence: number;
};

const FX: Record<Scenario, EffectVector> = {
  none:        { hr_rate: 0,   spo2_rate: 0,  temp_rate: 0,    stress_rate: -1,  cardiac_risk_rate: -0.5, resp_health_rate: 0.2,  recovery_rate: 1,   confidence: 95 },
  exercise:    { hr_rate: 30,  spo2_rate: -1, temp_rate: 1.5,  stress_rate: 10,  cardiac_risk_rate: 5,    resp_health_rate: -3,   recovery_rate: -5,  confidence: 88 },
  fever:       { hr_rate: 10,  spo2_rate: -2, temp_rate: 2.0,  stress_rate: 15,  cardiac_risk_rate: 8,    resp_health_rate: -5,   recovery_rate: -8,  confidence: 82 },
  low_oxygen:  { hr_rate: 15,  spo2_rate: -8, temp_rate: 0.2,  stress_rate: 20,  cardiac_risk_rate: 12,   resp_health_rate: -10,  recovery_rate: -10, confidence: 79 },
  drug_admin:  { hr_rate: -12, spo2_rate: 1,  temp_rate: -0.5, stress_rate: -20, cardiac_risk_rate: -10,  resp_health_rate: 5,    recovery_rate: 8,   confidence: 85 },
  dehydration: { hr_rate: 18,  spo2_rate: -1, temp_rate: 0.8,  stress_rate: 12,  cardiac_risk_rate: 9,    resp_health_rate: -4,   recovery_rate: -12, confidence: 81 },
};

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

// Safe ES2017-compatible findLastIndex
function findLastIdx(arr: number[], predicate: (v: number) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return 0;
}

// Project a TwinState forward by `hours` under a scenario
function project(state: TwinState, scenario: Scenario, hours: number): TwinState {
  const fx = FX[scenario];
  const decay = hours > 24 ? 0.4 : hours > 1 ? 0.75 : 1.0;
  const hr   = clamp(state.heartRate   + fx.hr_rate           * hours * decay, 30, 220);
  const spo2 = clamp(state.spo2        + fx.spo2_rate         * hours * decay, 70, 100);
  const temp = clamp(state.temperature + fx.temp_rate         * hours * decay, 34, 42);
  const cardiacRiskBase = 5; // use neutral base for projections
  const scores = computeScores(hr, spo2, temp, cardiacRiskBase);
  return {
    ...state,
    heartRate: hr, spo2, temperature: temp,
    ...scores,
    conditionProbabilities: classifyCondition(hr, spo2, temp),
  };
}

// ── Shared chart defaults ─────────────────────────────────────────────────────

const sharedTooltip = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  borderColor: "rgba(244, 180, 196, 0.4)",
  borderWidth: 1,
  titleColor: "var(--text-primary)",
  bodyColor: "var(--text-secondary)",
  padding: 12,
  cornerRadius: 8,
};

const sharedScales = {
  x: {
    grid: { color: "rgba(0, 0, 0, 0.06)" },
    ticks: { color: "#64748b", font: { size: 10 } },
    border: { display: false },
  },
  y: {
    grid: { color: "rgba(0, 0, 0, 0.06)" },
    ticks: { color: "#64748b", font: { size: 10 } },
    border: { display: false },
  },
};

const sectionLabel = (text: string) => (
  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.25em", color: "var(--text-muted)", marginBottom: 16 }}>
    {text}
  </div>
);

// ── Stress Diagnostic Panel (Potentiometer and 60s trend) ─────────────────────

function StressPanel() {
  const { sensorData, stressHistory, lastUpdated } = useSensor();
  const stress = sensorData.stress;

  let statusLabel = "Stable";
  let statusColor = "#059669"; // emerald
  let riskLabel = "Low";
  let bgGradient = "linear-gradient(135deg, rgba(5,150,105,0.06) 0%, rgba(255,255,255,0.9) 100%)";

  if (stress <= 30) {
    statusLabel = "Stable";
    statusColor = "#059669";
    riskLabel = "Low";
    bgGradient = "linear-gradient(135deg, rgba(5,150,105,0.05) 0%, rgba(255,255,255,0.95) 100%)";
  } else if (stress <= 70) {
    statusLabel = "Elevated";
    statusColor = "#d97706"; // amber
    riskLabel = "Medium";
    bgGradient = "linear-gradient(135deg, rgba(217,119,6,0.05) 0%, rgba(255,255,255,0.95) 100%)";
  } else {
    statusLabel = "Critical";
    statusColor = "#dc2626"; // red
    riskLabel = "High";
    bgGradient = "linear-gradient(135deg, rgba(220,38,38,0.05) 0%, rgba(255,255,255,0.95) 100%)";
  }

  const transitionStyle = {
    transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const chartData = {
    labels: stressHistory.map((h) => h.time),
    datasets: [
      {
        label: "Stress Level (%)",
        data: stressHistory.map((h) => h.stress),
        borderColor: statusColor,
        backgroundColor: `${statusColor}10`,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: sharedTooltip,
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#475569", font: { size: 8 } },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#475569", font: { size: 8 } },
        border: { display: false },
      },
    },
  };

  const updatedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString()
    : "No updates";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 8 }}>
      {/* Stress Card */}
      <div
        style={{
          background: bgGradient,
          border: `1px solid ${statusColor}33`,
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: `0 0 20px ${statusColor}11`,
          position: "relative",
          overflow: "hidden",
          ...transitionStyle,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
            Stress Diagnostics
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace" }}>
            {updatedTime}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 900, fontFamily: "monospace", color: statusColor, ...transitionStyle }}>
            {stress}
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-muted)" }}>%</span>
        </div>

        {/* Live Gauge */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span style={{ color: "var(--text-muted)" }}>Status:</span>
            <span style={{ color: statusColor, ...transitionStyle }}>{statusLabel}</span>
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(0,0,0,0.06)" }}>
            <div
              style={{
                width: `${stress}%`,
                height: "100%",
                background: statusColor,
                borderRadius: 3,
                boxShadow: `0 0 10px ${statusColor}`,
                ...transitionStyle,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
            <span style={{ color: "var(--text-muted)" }}>Risk Class:</span>
            <span style={{ color: statusColor, ...transitionStyle }}>{riskLabel} Risk</span>
          </div>
        </div>

        {/* HUD pulse node */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
          <div className="pulse-orb" style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, ...transitionStyle }} />
        </div>
      </div>

      {/* 60s Line Chart */}
      <Panel title="Stress History (Last 60 Seconds)" badge="Real-time Potentiometer">
        <div style={{ height: 130 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </Panel>
    </div>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column" as const,
      gap: 16,
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--text-primary)" }}>
          {title}
        </span>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "rgba(2,132,199,0.08)", color: "var(--accent-cyan)", border: "1px solid rgba(2,132,199,0.15)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── 1. Physiology Timeline ────────────────────────────────────────────────────

function PhysiologyTimeline({ state, scenario }: { state: TwinState; scenario: Scenario }) {
  const [metric, setMetric] = useState<"heartRate" | "spo2" | "temperature" | "stressIndex">("heartRate");
  const METRICS = [
    { key: "heartRate" as const,    label: "Heart Rate",   color: "#22d3ee", unit: "bpm" },
    { key: "spo2" as const,         label: "SpO₂",         color: "#34d399", unit: "%" },
    { key: "temperature" as const,  label: "Temperature",  color: "#fbbf24", unit: "°C" },
    { key: "stressIndex" as const,  label: "Stress Index", color: "#f87171", unit: "" },
  ];
  const m = METRICS.find(x => x.key === metric)!;

  const projected = useMemo(() =>
    TIMELINE_HOURS.map(h => project(state, scenario, h)[m.key] as number),
    [state, scenario, m.key]
  );

  const data = {
    labels: TIMELINE_LABELS,
    datasets: [{
      label: m.label,
      data: projected,
      borderColor: m.color,
      backgroundColor: `${m.color}18`,
      borderWidth: 2.5,
      pointRadius: 4,
      pointBackgroundColor: m.color,
      fill: true,
      tension: 0.4,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: sharedTooltip },
    scales: {
      ...sharedScales,
      y: { ...sharedScales.y, title: { display: true, text: `${m.label} (${m.unit})`, color: "#475569", font: { size: 9 } } },
    },
  };

  const current = state[m.key] as number;
  const end = projected[projected.length - 1];
  const delta = end - current;

  return (
    <Panel title="Physiology Timeline" badge="Prediction">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        {METRICS.map(mx => (
          <button key={mx.key} onClick={() => setMetric(mx.key)} style={{
            padding: "5px 14px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            cursor: "pointer", border: "1px solid",
            background: metric === mx.key ? `${mx.color}18` : "rgba(0,0,0,0.03)",
            borderColor: metric === mx.key ? `${mx.color}55` : "rgba(0,0,0,0.08)",
            color: metric === mx.key ? mx.color : "#94a3b8",
            transition: "all 0.15s",
          }}>{mx.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24, marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Current</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: m.color }}>{current.toFixed(1)}<span style={{ fontSize: 11, marginLeft: 3, color: "#94a3b8" }}>{m.unit}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>24h Projection</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: m.color }}>{end.toFixed(1)}<span style={{ fontSize: 11, marginLeft: 3, color: "#94a3b8" }}>{m.unit}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Delta</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: delta > 0 ? "#f87171" : "#34d399" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</div>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Line data={data} options={options} />
      </div>
    </Panel>
  );
}

// ── 2. Intervention Comparison Engine ─────────────────────────────────────────

function InterventionComparison({ state }: { state: TwinState }) {
  const [yMetric, setYMetric] = useState<"healthScore" | "cardiacRisk">("healthScore");
  const [selectedScenarios, setSelectedScenarios] = useState<Set<Scenario>>(
    new Set(["none", "exercise", "drug_admin", "low_oxygen"])
  );

  const toggle = (id: Scenario) => {
    setSelectedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const datasets = useMemo(() =>
    SCENARIOS_ALL.filter(s => selectedScenarios.has(s.id)).map(s => ({
      label: s.label,
      data: TIMELINE_HOURS.map(h => project(state, s.id, h)[yMetric] as number),
      borderColor: s.color,
      backgroundColor: `${s.color}12`,
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: s.color,
      fill: false,
      tension: 0.4,
    })),
    [state, selectedScenarios, yMetric]
  );

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: "#64748b", font: { size: 10 }, boxWidth: 12, padding: 16 } },
      tooltip: sharedTooltip,
    },
    scales: {
      ...sharedScales,
      y: { ...sharedScales.y, min: 0, max: 100, title: { display: true, text: yMetric === "healthScore" ? "Health Score" : "Cardiac Risk", color: "#475569", font: { size: 9 } } },
    },
  };

  return (
    <Panel title="Intervention Comparison Engine" badge="Multi-scenario">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {SCENARIOS_ALL.map(s => (
            <button key={s.id} onClick={() => toggle(s.id)} style={{
              padding: "4px 12px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
              cursor: "pointer", border: "1px solid",
              background: selectedScenarios.has(s.id) ? `${s.color}18` : "rgba(0,0,0,0.03)",
              borderColor: selectedScenarios.has(s.id) ? `${s.color}55` : "rgba(0,0,0,0.08)",
              color: selectedScenarios.has(s.id) ? s.color : "#94a3b8",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["healthScore", "cardiacRisk"] as const).map(k => (
            <button key={k} onClick={() => setYMetric(k)} style={{
              padding: "4px 12px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
              cursor: "pointer", border: "1px solid",
              background: yMetric === k ? "rgba(14,165,233,0.1)" : "rgba(0,0,0,0.03)",
              borderColor: yMetric === k ? "rgba(14,165,233,0.3)" : "rgba(0,0,0,0.08)",
              color: yMetric === k ? "#0ea5e9" : "#94a3b8",
            }}>{k === "healthScore" ? "Health Score" : "Cardiac Risk"}</button>
          ))}
        </div>
      </div>
      <div style={{ height: 240 }}>
        <Line data={{ labels: TIMELINE_LABELS, datasets }} options={options} />
      </div>
    </Panel>
  );
}

// ── 3. Disease Progression Timeline ──────────────────────────────────────────

const STAGES = ["Healthy", "Early Stage", "Moderate", "Severe", "Critical"];

function progressionScore(state: TwinState, scenario: Scenario, hours: number): number {
  const s = project(state, scenario, hours);
  // 0 = healthy, 100 = critical
  return clamp(
    (s.cardiacRisk * 0.5) +
    ((100 - s.respiratoryHealth) * 0.2) +
    (s.stressIndex * 0.2) +
    ((100 - s.recoveryScore) * 0.1),
    0, 100
  );
}

function DiseaseProgression({ state, scenario }: { state: TwinState; scenario: Scenario }) {
  const noActionScores = useMemo(() =>
    TIMELINE_HOURS.map(h => progressionScore(state, "none", h)), [state]);
  const interventionScores = useMemo(() =>
    TIMELINE_HOURS.map(h => progressionScore(state, scenario, h)), [state, scenario]);

  const stageThresholds = [0, 20, 40, 60, 80];

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: "#64748b", font: { size: 10 }, boxWidth: 12, padding: 16 } },
      tooltip: { ...sharedTooltip, callbacks: {
        label: (ctx: import("chart.js").TooltipItem<"line">) => {
          const v = ctx.parsed.y ?? 0;
          const stage = STAGES[findLastIdx(stageThresholds, (t: number) => v >= t)] ?? "Unknown";
          return `${ctx.dataset.label ?? ""}: ${v.toFixed(0)} — ${stage}`;
        },
      }},
    },
    scales: {
      ...sharedScales,
      y: {
        ...sharedScales.y,
        min: 0, max: 100,
        title: { display: true, text: "Progression Score", color: "#475569", font: { size: 9 } },
      },
    },
  };

  const current = noActionScores[0];
  const currentStage = STAGES[findLastIdx(stageThresholds, (t: number) => current >= t)];
  const stageColors = ["#34d399", "#fbbf24", "#fb923c", "#f87171", "#dc2626"];
  const stageIdx = findLastIdx(stageThresholds, (t: number) => current >= t);

  return (
    <Panel title="Disease Progression Timeline" badge="Trajectory">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: stageColors[stageIdx] }}>{currentStage}</div>
        <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${current}%`, borderRadius: 9999, background: stageColors[stageIdx], transition: "width 0.5s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{current.toFixed(0)}/100</div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: "center" as const, fontSize: 8, fontWeight: 700,
            color: currentStage === s ? stageColors[i] : "#cbd5e1",
            padding: "4px 0", borderBottom: `2px solid ${currentStage === s ? stageColors[i] : "rgba(0,0,0,0.06)"}`,
            textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            {s}
          </div>
        ))}
      </div>
      <div style={{ height: 180 }}>
        <Line data={{ labels: TIMELINE_LABELS, datasets: [
          { label: "No Intervention", data: noActionScores, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 2, borderDash: [4, 4], pointRadius: 3, fill: true, tension: 0.4 } as never,
          { label: "With Intervention", data: interventionScores, borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.08)", borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.4 } as never,
        ]}} options={options} />
      </div>
    </Panel>
  );
}

// ── 4. Health Radar ────────────────────────────────────────────────────────────

function HealthRadar({ state, predicted }: { state: TwinState; predicted: TwinState }) {
  const axes = ["Cardiac Health", "Resp. Health", "Recovery", "Low Stress", "Hydration", "Oxygenation"];
  const hydration = clamp(100 - (state.heartRate - 60) * 0.5, 0, 100); // proxy
  const predHydration = clamp(100 - (predicted.heartRate - 60) * 0.5, 0, 100);

  const current = [
    clamp(100 - state.cardiacRisk, 0, 100),
    state.respiratoryHealth,
    state.recoveryScore,
    clamp(100 - state.stressIndex, 0, 100),
    hydration,
    state.spo2 - 70, // maps 70-100 to 0-30, scale up
  ].map((v, i) => i === 5 ? clamp(v * 3.3, 0, 100) : v);

  const pred = [
    clamp(100 - predicted.cardiacRisk, 0, 100),
    predicted.respiratoryHealth,
    predicted.recoveryScore,
    clamp(100 - predicted.stressIndex, 0, 100),
    predHydration,
    (predicted.spo2 - 70),
  ].map((v, i) => i === 5 ? clamp(v * 3.3, 0, 100) : v);

  const data = {
    labels: axes,
    datasets: [
      {
        label: "Current",
        data: current,
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34,211,238,0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#22d3ee",
        pointRadius: 3,
      },
      {
        label: "Predicted",
        data: pred,
        borderColor: "#c084fc",
        backgroundColor: "rgba(192,132,252,0.1)",
        borderWidth: 2,
        borderDash: [4, 3],
        pointBackgroundColor: "#c084fc",
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        grid: { color: "rgba(0,0,0,0.07)" },
        angleLines: { color: "rgba(0,0,0,0.07)" },
        pointLabels: { color: "#475569", font: { size: 10 } },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { display: true, labels: { color: "#64748b", font: { size: 10 }, boxWidth: 12, padding: 12 } },
      tooltip: sharedTooltip,
    },
  };

  return (
    <Panel title="Digital Twin Health Radar" badge="Holistic">
      <div style={{ height: 280 }}>
        <Radar data={data} options={options} />
      </div>
    </Panel>
  );
}

// ── 5. Risk Trajectory ────────────────────────────────────────────────────────

function RiskTrajectory({ state, scenario }: { state: TwinState; scenario: Scenario }) {
  const cardiacSeries  = useMemo(() => TIMELINE_HOURS.map(h => project(state, scenario, h).cardiacRisk), [state, scenario]);
  const respSeries     = useMemo(() => TIMELINE_HOURS.map(h => clamp(100 - project(state, scenario, h).respiratoryHealth, 0, 100)), [state, scenario]);
  const overallSeries  = useMemo(() => TIMELINE_HOURS.map(h => {
    const s = project(state, scenario, h);
    return clamp((s.cardiacRisk * 0.6 + (100 - s.respiratoryHealth) * 0.25 + s.stressIndex * 0.15), 0, 100);
  }), [state, scenario]);

  const data = {
    labels: TIMELINE_LABELS,
    datasets: [
      { label: "Cardiac Risk",    data: cardiacSeries,  borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 },
      { label: "Respiratory Risk",data: respSeries,     borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.06)",  borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 },
      { label: "Overall Risk",    data: overallSeries,  borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.04)", borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, borderDash: [] },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { color: "#64748b", font: { size: 10 }, boxWidth: 12, padding: 16 } }, tooltip: sharedTooltip },
    scales: { ...sharedScales, y: { ...sharedScales.y, min: 0, max: 100, title: { display: true, text: "Risk Score", color: "#475569", font: { size: 9 } } } },
  };

  const riskNow = overallSeries[0];
  const risk7d  = overallSeries[overallSeries.length - 1];
  const rCol = riskNow > 60 ? "#f87171" : riskNow > 30 ? "#fbbf24" : "#34d399";

  return (
    <Panel title="Risk Trajectory Analysis" badge="Area">
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Risk Now</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: rCol }}>{riskNow.toFixed(0)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>24h Projection</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: risk7d > riskNow ? "#f87171" : "#34d399" }}>{risk7d.toFixed(0)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Delta</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: risk7d > riskNow ? "#f87171" : "#34d399" }}>
            {risk7d > riskNow ? "+" : ""}{(risk7d - riskNow).toFixed(0)}
          </div>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Line data={data} options={options} />
      </div>
    </Panel>
  );
}

// ── 6. Prediction Confidence ─────────────────────────────────────────────────

function PredictionConfidence({ scenario }: { scenario: Scenario }) {
  const baseConf = FX[scenario].confidence;
  const confSeries = TIMELINE_HOURS.map((h, i) => {
    if (i === 0) return baseConf;
    const decay = h > 24 ? 15 : h > 1 ? 5 : 2;
    return clamp(baseConf - decay * i, 50, 99);
  });

  const data = {
    labels: TIMELINE_LABELS,
    datasets: [{
      label: "Model Confidence",
      data: confSeries,
      borderColor: "#c084fc",
      backgroundColor: "rgba(192,132,252,0.08)",
      borderWidth: 2.5,
      pointBackgroundColor: "#c084fc",
      pointRadius: 4,
      fill: true,
      tension: 0.3,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: sharedTooltip },
    scales: { ...sharedScales, y: { ...sharedScales.y, min: 50, max: 100, title: { display: true, text: "Confidence (%)", color: "#475569", font: { size: 9 } } } },
  };

  return (
    <Panel title="Prediction Confidence" badge="Uncertainty">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        {TIMELINE_LABELS.map((l, i) => (
          <div key={l} style={{ flex: 1, textAlign: "center" as const, padding: "8px 4px", background: "rgba(168,85,247,0.06)", borderRadius: 8, border: "1px solid rgba(168,85,247,0.15)" }}>
            <div style={{ fontSize: 8, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" as const }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: "#a855f7" }}>{confSeries[i]}%</div>
          </div>
        ))}
      </div>
      <div style={{ height: 150 }}>
        <Line data={data} options={options} />
      </div>
    </Panel>
  );
}

// ── 7. What-If Scenario Comparator ────────────────────────────────────────────

function WhatIfComparator({ state }: { state: TwinState }) {
  const METRICS_DISPLAY = [
    { key: "heartRate" as keyof TwinState,    label: "Heart Rate",    unit: "bpm",  fmt: (v: number) => v.toFixed(0) },
    { key: "spo2" as keyof TwinState,         label: "SpO₂",          unit: "%",    fmt: (v: number) => v.toFixed(1) },
    { key: "healthScore" as keyof TwinState,  label: "Health Score",  unit: "/100", fmt: (v: number) => v.toFixed(0) },
    { key: "cardiacRisk" as keyof TwinState,  label: "Cardiac Risk",  unit: "/100", fmt: (v: number) => v.toFixed(0) },
  ];

  // Project each scenario at 1 hour
  const results = useMemo(() =>
    SCENARIOS_ALL.map(s => ({ ...s, state: project(state, s.id, 1) })),
    [state]
  );

  const getColor = (key: keyof TwinState, val: number) => {
    if (key === "cardiacRisk") return val > 60 ? "#f87171" : val > 30 ? "#fbbf24" : "#34d399";
    if (key === "healthScore") return val > 70 ? "#34d399" : val > 40 ? "#fbbf24" : "#f87171";
    if (key === "heartRate") return val > 100 || val < 50 ? "#f87171" : "#22d3ee";
    if (key === "spo2") return val < 95 ? "#f87171" : "#34d399";
    return "#22d3ee";
  };

  return (
    <Panel title="What-If Scenario Comparator" badge="1-hour projection">
      <div style={{ overflowX: "auto" as const }}>
        <table style={{ width: "100%", borderCollapse: "separate" as const, borderSpacing: "0 6px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" as const, fontSize: 9, fontWeight: 800, color: "#94a3b8", padding: "4px 12px", textTransform: "uppercase" as const, letterSpacing: "0.15em" }}>Scenario</th>
              {METRICS_DISPLAY.map(m => (
                <th key={m.key as string} style={{ textAlign: "center" as const, fontSize: 9, fontWeight: 800, color: "#94a3b8", padding: "4px 12px", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id} style={{ background: "rgba(0,0,0,0.02)", borderRadius: 8 }}>
                <td style={{ padding: "10px 12px", borderRadius: "8px 0 0 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.label}</span>
                  </div>
                </td>
                {METRICS_DISPLAY.map(m => {
                  const val = r.state[m.key] as number;
                  const baseVal = state[m.key] as number;
                  const delta = val - baseVal;
                  const col = getColor(m.key, val);
                  return (
                    <td key={m.key as string} style={{ textAlign: "center" as const, padding: "10px 12px" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: col }}>{m.fmt(val)}</div>
                      {r.id !== "none" && (
                        <div style={{ fontSize: 9, color: delta > 0 ? "#f87171" : "#34d399", fontFamily: "monospace" }}>
                          {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type Props = {
  twinState: TwinState;
  scenario: Scenario;
  prediction: PredictionResult;
  packets: unknown[];
};

export default function TwinAnalytics({ twinState, scenario, prediction, packets }: Props) {
  const hasSignal = packets.length > 0;
  const latestPacket = (packets[packets.length - 1] as { signals?: { ECG?: number[]; PPG?: number[] } } | undefined)?.signals;

  // ECG mini
  const ecgData = latestPacket?.ECG ?? Array(100).fill(0);
  const ppgData = latestPacket?.PPG ?? Array(100).fill(0);
  const labels100 = Array.from({ length: 100 }, (_, i) => i);

  const miniLineOptions = (color: string) => ({
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 as const },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false, min: -1.5, max: 1.5 },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
      {sectionLabel("Digital Twin Analytics")}
      <StressPanel />

      {/* Row 1: Physiology Timeline + Intervention Comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PhysiologyTimeline state={twinState} scenario={scenario} />
        <InterventionComparison state={twinState} />
      </div>

      {/* Row 2: Disease Progression + Health Radar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DiseaseProgression state={twinState} scenario={scenario} />
        <HealthRadar state={twinState} predicted={prediction.predicted} />
      </div>

      {/* Row 3: Risk Trajectory + Confidence */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <RiskTrajectory state={twinState} scenario={scenario} />
        <PredictionConfidence scenario={scenario} />
      </div>

      {/* Row 4: What-If full width */}
      <WhatIfComparator state={twinState} />

    </div>
  );
}

// ── Named exports for sidebar sections ───────────────────────────────────────

type CoreProps = { twinState: TwinState; scenario: Scenario; prediction: PredictionResult; packets: unknown[] };

export function TwinAnalyticsCore({ twinState, scenario, prediction, packets }: CoreProps) {
  const hasSignal = packets.length > 0;
  const latestPacket = (packets[packets.length - 1] as { signals?: { ECG?: number[]; PPG?: number[] } } | undefined)?.signals;
  const ecgData = latestPacket?.ECG ?? Array(100).fill(0);
  const ppgData = latestPacket?.PPG ?? Array(100).fill(0);
  const labels100 = Array.from({ length: 100 }, (_, i) => i);
  const miniOpts = (color: string) => ({
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 as const },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false, min: -1.5, max: 1.5 } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
      <StressPanel />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PhysiologyTimeline state={twinState} scenario={scenario} />
        <InterventionComparison state={twinState} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DiseaseProgression state={twinState} scenario={scenario} />
        <HealthRadar state={twinState} predicted={prediction.predicted} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <RiskTrajectory state={twinState} scenario={scenario} />
        <PredictionConfidence scenario={scenario} />
      </div>
    </div>
  );
}

export function TwinScenarioComparator({ twinState }: { twinState: TwinState }) {
  return <WhatIfComparator state={twinState} />;
}
