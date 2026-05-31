"use client";
import React, { useState } from "react";

const BODY_PARTS = [
  { id: "ECG", name: "Heart (ECG)", icon: "🫀" },
  { id: "EMG", name: "Muscles (EMG)", icon: "💪" },
  { id: "SpO2", name: "Oxygen (SpO2)", icon: "🩸" },
  { id: "EDA", name: "Skin/Nerves (EDA)", icon: "🧠" },
];

export default function ExaminationControl({ onStart }: { onStart: (code: string, signal: string) => void }) {
  const [code, setCode] = useState(`// Paste your Arduino codebase here
void loop() {
  int val = analogRead(A0);
  if (val > 700) Serial.println("PEAK");
}`);
  const [signal, setSignal] = useState("ECG");

  return (
    <div className="glass-card p-6 animate-in">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-accent-cyan">🔬</span> HIL Examination Room
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Editor */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Target Codebase (Arduino/C++)
          </label>
          <div className="relative flex-1 min-h-[300px]">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm rounded-xl outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-color)",
                color: "var(--accent-cyan)",
                resize: "none"
              }}
              placeholder="Paste your firmware code here..."
            />
          </div>
        </div>

        {/* Right: Body Part Selection */}
        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Select Body System to Examine
          </label>
          <div className="grid grid-cols-2 gap-3">
            {BODY_PARTS.map((part) => (
              <button
                key={part.id}
                onClick={() => setSignal(part.id)}
                className={`p-4 rounded-xl border transition-all text-left flex items-center gap-3 ${
                  signal === part.id 
                  ? "border-accent-cyan bg-accent-cyan/10 ring-1 ring-accent-cyan/30" 
                  : "border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl">{part.icon}</span>
                <div>
                  <div className={`text-sm font-bold ${signal === part.id ? "text-accent-cyan" : "text-text-primary"}`}>
                    {part.name}
                  </div>
                  <div className="text-[10px] text-text-muted">Digital Twin Data</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <button 
              onClick={() => onStart(code, signal)}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "var(--gradient-cyan)",
                boxShadow: "0 0 30px rgba(6, 182, 212, 0.4)"
              }}
            >
              🚀 Start AI Examination
            </button>
            <p className="text-[10px] text-center mt-3 text-text-muted">
              This will compile your code and simulate a human body for real-time validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
