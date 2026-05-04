"use client";
import React, { useState } from "react";

type Persona = {
  persona_id: string;
  display_name: string;
  age: number;
  sex: string;
  hr_bpm: number;
  hr_min: number;
  hr_max: number;
  conditions: string[];
  noise_level: number;
  arrhythmia_type: string | null;
  weight_kg?: number;
  complexity_score?: number;
  signal_params?: {
    ecg?: { pr_interval_ms: number; qrs_duration_ms: number; qt_interval_ms: number };
    spo2?: { baseline_pct: number; variability: number };
  };
};

const CONDITIONS = [
  "Normal",
  "Atrial Fibrillation",
  "STEMI",
  "Bradycardia",
  "Tachycardia",
  "Long QT Syndrome",
];

export default function PersonaGenerator() {
  const [condition, setCondition] = useState("Normal");
  const [complexity, setComplexity] = useState(3);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/personas/generate?condition=${encodeURIComponent(
          condition
        )}&complexity=${complexity}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setPersona(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate persona");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass-card p-6 animate-in"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            AI Persona Generator
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Powered by Gemini 2.5 Pro
          </p>
        </div>
        <div
          className="text-xs font-mono px-3 py-1 rounded-full"
          style={{
            background: "rgba(6,182,212,0.1)",
            color: "var(--accent-cyan)",
            border: "1px solid rgba(6,182,212,0.2)",
          }}
        >
          RAG-Enhanced
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1" style={{ minWidth: 180 }}>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            CONDITION
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 120 }}>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            COMPLEXITY ({complexity})
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={complexity}
            onChange={(e) => setComplexity(parseInt(e.target.value))}
            className="w-full mt-2"
            style={{ accentColor: "var(--accent-cyan)" }}
          />
        </div>
        <div className="flex items-end">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Generating...
              </>
            ) : (
              <>
                <span>⚡</span> Generate
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg mb-4 text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          ✗ {error}
        </div>
      )}

      {persona && (
        <div className="chart-container mt-2">
          {/* Persona header */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{
                background: "var(--gradient-cyan)",
                color: "white",
              }}
            >
              {persona.display_name.charAt(0)}
            </div>
            <div>
              <h4
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {persona.display_name}
              </h4>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {persona.age}y {persona.sex} • {persona.weight_kg || "—"}kg •
                ID: <span className="font-mono">{persona.persona_id.slice(0, 8)}…</span>
              </p>
            </div>
          </div>

          {/* Vital stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <VitalStat label="Heart Rate" value={`${persona.hr_bpm}`} unit="bpm" color="var(--accent-cyan)" />
            <VitalStat label="HR Range" value={`${persona.hr_min}–${persona.hr_max}`} unit="bpm" color="var(--accent-blue)" />
            <VitalStat label="Noise Level" value={`${(persona.noise_level * 100).toFixed(0)}`} unit="%" color="var(--accent-amber)" />
            <VitalStat
              label="Arrhythmia"
              value={persona.arrhythmia_type || "None"}
              unit=""
              color={persona.arrhythmia_type ? "var(--accent-red)" : "var(--accent-emerald)"}
            />
          </div>

          {/* Conditions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {persona.conditions.map((c, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  color: "var(--accent-purple)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                {c}
              </span>
            ))}
          </div>

          {/* Signal params */}
          {persona.signal_params?.ecg && (
            <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>
                PR:{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {persona.signal_params.ecg.pr_interval_ms}ms
                </span>
              </span>
              <span>
                QRS:{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {persona.signal_params.ecg.qrs_duration_ms}ms
                </span>
              </span>
              <span>
                QT:{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {persona.signal_params.ecg.qt_interval_ms}ms
                </span>
              </span>
              {persona.signal_params.spo2 && (
                <span>
                  SpO₂:{" "}
                  <span style={{ color: "var(--text-secondary)" }}>
                    {persona.signal_params.spo2.baseline_pct}%
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VitalStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.03)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-lg font-bold font-mono" style={{ color }}>
        {value}
        {unit && (
          <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
