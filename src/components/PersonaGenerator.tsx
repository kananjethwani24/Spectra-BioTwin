"use client";
import React, { useState } from "react";
import type { PersonaPayload, TwinState } from "@/hooks/useTwinState";

// Accurate clinical mock data for each condition (Normal uses live sensor data)
const CONDITION_MOCK_DATA: Record<string, PersonaPayload> = {
  "Atrial Fibrillation": {
    persona_id: "mock-af-001",
    display_name: "Mock AF Patient",
    age: 68,
    sex: "M",
    weight_kg: 82,
    hr_bpm: 142,
    hr_min: 120,
    hr_max: 170,
    conditions: ["Atrial Fibrillation"],
    noise_level: 0.12,
    arrhythmia_type: "AF",
    signal_params: {
      ecg: { pr_interval_ms: 0, qrs_duration_ms: 100, qt_interval_ms: 380 },
      spo2: { baseline_pct: 94, variability: 3 },
    },
  },
  "STEMI": {
    persona_id: "mock-stemi-001",
    display_name: "Mock STEMI Patient",
    age: 58,
    sex: "M",
    weight_kg: 90,
    hr_bpm: 108,
    hr_min: 90,
    hr_max: 130,
    conditions: ["STEMI"],
    noise_level: 0.08,
    arrhythmia_type: null,
    signal_params: {
      ecg: { pr_interval_ms: 160, qrs_duration_ms: 130, qt_interval_ms: 420 },
      spo2: { baseline_pct: 91, variability: 4 },
    },
  },
  "Bradycardia": {
    persona_id: "mock-brad-001",
    display_name: "Mock Bradycardia Patient",
    age: 72,
    sex: "F",
    weight_kg: 63,
    hr_bpm: 42,
    hr_min: 35,
    hr_max: 55,
    conditions: ["Bradycardia"],
    noise_level: 0.04,
    arrhythmia_type: null,
    signal_params: {
      ecg: { pr_interval_ms: 220, qrs_duration_ms: 95, qt_interval_ms: 440 },
      spo2: { baseline_pct: 96, variability: 1 },
    },
  },
  "Tachycardia": {
    persona_id: "mock-tachy-001",
    display_name: "Mock Tachycardia Patient",
    age: 34,
    sex: "F",
    weight_kg: 61,
    hr_bpm: 128,
    hr_min: 100,
    hr_max: 160,
    conditions: ["Tachycardia"],
    noise_level: 0.06,
    arrhythmia_type: null,
    signal_params: {
      ecg: { pr_interval_ms: 140, qrs_duration_ms: 88, qt_interval_ms: 320 },
      spo2: { baseline_pct: 96, variability: 2 },
    },
  },
  "Long QT Syndrome": {
    persona_id: "mock-lqt-001",
    display_name: "Mock Long QT Patient",
    age: 26,
    sex: "F",
    weight_kg: 56,
    hr_bpm: 72,
    hr_min: 60,
    hr_max: 90,
    conditions: ["Long QT Syndrome"],
    noise_level: 0.05,
    arrhythmia_type: "LQT",
    signal_params: {
      ecg: { pr_interval_ms: 155, qrs_duration_ms: 100, qt_interval_ms: 580 },
      spo2: { baseline_pct: 97, variability: 1 },
    },
  },
};

const CONDITIONS = [
  "Normal",
  "Atrial Fibrillation",
  "STEMI",
  "Bradycardia",
  "Tachycardia",
  "Long QT Syndrome",
];

type Props = {
  onPersonaApplied: (persona: PersonaPayload) => void;
  onRemovePersona: () => void;
  isPersonaApplied: boolean;
  twinState: TwinState;
};

export default function PersonaGenerator({ onPersonaApplied, onRemovePersona, isPersonaApplied, twinState }: Props) {
  const [condition, setCondition] = useState("Normal");
  const [persona, setPersona] = useState<PersonaPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    onRemovePersona();

    if (condition === "Normal") {
      // Fetch live sensor data from the ESP32 backend
      try {
        const res = await fetch("http://localhost:8000/api/v1/sensor-data");
        const data = await res.json();
        const hr = data.heart_rate ?? data.hr_bpm ?? 72;
        const spo2 = data.spo2 ?? 98;
        const livePersona: PersonaPayload = {
          persona_id: "live-sensor-now",
          display_name: "Live Sensor Reading",
          age: 0,
          sex: "—",
          weight_kg: 0,
          hr_bpm: Math.round(hr),
          hr_min: Math.round(hr * 0.85),
          hr_max: Math.round(hr * 1.15),
          conditions: ["Normal"],
          noise_level: 0.01,
          arrhythmia_type: null,
          signal_params: {
            ecg: { pr_interval_ms: 0, qrs_duration_ms: 0, qt_interval_ms: 0 },
            spo2: { baseline_pct: Math.round(spo2), variability: 1 },
          },
        };
        setPersona(livePersona);
      } catch {
        // Fallback: show a friendly error persona
        setPersona({
          persona_id: "sensor-unavailable",
          display_name: "Sensor Unavailable",
          age: 0, sex: "—", weight_kg: 0,
          hr_bpm: 0, hr_min: 0, hr_max: 0,
          conditions: ["Normal"], noise_level: 0,
          arrhythmia_type: null,
          signal_params: {
            ecg: { pr_interval_ms: 0, qrs_duration_ms: 0, qt_interval_ms: 0 },
            spo2: { baseline_pct: 0, variability: 0 },
          },
        });
      }
    } else {
      // All clinical conditions use pre-defined mock data
      await new Promise((r) => setTimeout(r, 600));
      const mockPersona = CONDITION_MOCK_DATA[condition];
      if (mockPersona) setPersona(mockPersona);
    }

    setLoading(false);
  };

  const handleApplyToTwin = () => {
    if (!persona) return;
    if (isPersonaApplied) {
      onRemovePersona();
    } else {
      onPersonaApplied(persona);
    }
  };

  return (
    <div className="flex flex-col gap-5" style={{ height: "100%" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            AI Persona Generator
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Clinical mock data · 6 conditions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPersonaApplied && (
            <div
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "#059669",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              Applied to Twin ✓
            </div>
          )}
          <div
            className="text-xs font-mono px-3 py-1 rounded-full"
            style={{
              background: "rgba(6,182,212,0.1)",
              color: "var(--accent-cyan)",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            Clinical Mock
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1" style={{ minWidth: 180 }}>
          <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => { setCondition(e.target.value); setPersona(null); onRemovePersona(); }}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={generate}
            disabled={loading}
            style={{ minWidth: 110 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Loading...
              </>
            ) : (
              <><span>⚡</span> Generate</>
            )}
          </button>
        </div>
      </div>

      {persona && (
        <div className="flex flex-col gap-4 mt-1">
          {/* Persona header */}
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
              style={{ background: "var(--gradient-cyan)", color: "white", flexShrink: 0 }}
            >
              {persona.display_name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold" style={{ color: "var(--text-primary)" }}>
                {persona.display_name}
              </h4>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {persona.age}y {persona.sex} {persona.weight_kg}kg · ID: <span className="font-mono">{persona.persona_id.slice(0, 10)}</span>
              </p>
            </div>
          </div>

          {/* Vitals grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <VitalStat label="Heart Rate"  value={`${persona.hr_bpm}`} unit="bpm" color="var(--accent-cyan)" />
            <VitalStat label="SpO2"        value={`${persona.signal_params?.spo2?.baseline_pct ?? 97}`} unit="%" color="var(--accent-emerald)" />
            <VitalStat label="HR Range"    value={`${persona.hr_min}–${persona.hr_max}`} unit="bpm" color="var(--accent-blue)" />
            <VitalStat label="Noise"       value={`${(persona.noise_level * 100).toFixed(0)}`} unit="%" color="var(--accent-amber)" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <VitalStat label="PR Interval"   value={`${persona.signal_params?.ecg?.pr_interval_ms ?? "—"}`} unit="ms" color="#8b5cf6" />
            <VitalStat label="QRS Duration"  value={`${persona.signal_params?.ecg?.qrs_duration_ms ?? "—"}`} unit="ms" color="#ec4899" />
            <VitalStat label="QT Interval"   value={`${persona.signal_params?.ecg?.qt_interval_ms ?? "—"}`} unit="ms" color={condition === "Long QT Syndrome" ? "#ef4444" : "#8b5cf6"} />
            <VitalStat label="Arrhythmia"    value={persona.arrhythmia_type ?? "None"} unit="" color={persona.arrhythmia_type ? "var(--accent-red)" : "var(--accent-emerald)"} />
          </div>

          {/* Condition tag */}
          <div className="flex flex-wrap gap-2">
            {persona.conditions.map((c, i) => (
              <span
                key={i}
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  color: "#7c3aed",
                  border: "1px solid rgba(139,92,246,0.25)",
                }}
              >
                {c}
              </span>
            ))}
          </div>

          {/* Apply to Twin button */}
          <button
            onClick={handleApplyToTwin}
            style={{
              width: "100%",
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              cursor: "pointer",
              transition: "all 0.2s",
              background: isPersonaApplied
                ? "rgba(16,185,129,0.12)"
                : "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              color: isPersonaApplied ? "#059669" : "white",
              border: isPersonaApplied ? "1px solid rgba(16,185,129,0.3)" : "none",
              boxShadow: isPersonaApplied ? "none" : "0 4px 12px rgba(168,85,247,0.3)",
            }}
          >
            {isPersonaApplied ? "✓ Applied to Digital Twin" : "🔗 Apply to Twin"}
          </button>
        </div>
      )}
    </div>
  );
}

function VitalStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: "rgba(248,250,252,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontWeight: 600 }}>{label}</p>
      <p className="text-base font-bold font-mono" style={{ color }}>
        {value}
        {unit && <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>}
      </p>
    </div>
  );
}
