"use client";
import React from "react";

type TwinState = "pending" | "running" | "pass" | "fail";

type TestEntry = {
  id: string;
  name: string;
  condition: string;
  status: TwinState;
  hrBpm: number;
  signalType: string;
};

const MOCK_TESTS: TestEntry[] = [
  { id: "tw-001", name: "Normal Sinus", condition: "Healthy", status: "pass", hrBpm: 72, signalType: "ECG" },
  { id: "tw-002", name: "AF Detection", condition: "Atrial Fibrillation", status: "fail", hrBpm: 142, signalType: "ECG" },
  { id: "tw-003", name: "STEMI Alert", condition: "STEMI", status: "running", hrBpm: 98, signalType: "ECG" },
  { id: "tw-004", name: "SpO2 Baseline", condition: "Healthy", status: "pass", hrBpm: 68, signalType: "SpO2" },
  { id: "tw-005", name: "Bradycardia", condition: "Bradycardia", status: "pending", hrBpm: 48, signalType: "ECG" },
  { id: "tw-006", name: "Tachycardia", condition: "SVT", status: "pass", hrBpm: 180, signalType: "ECG" },
];

const statusBadge: Record<TwinState, string> = {
  pass: "badge-pass",
  fail: "badge-fail",
  running: "badge-running",
  pending: "badge-pending",
};

const statusIcon: Record<TwinState, string> = {
  pass: "✓",
  fail: "✗",
  running: "⟳",
  pending: "○",
};

export default function TestMatrix({
  twinStatus,
}: {
  twinStatus: Map<string, string>;
}) {
  // Merge real status data with mock data
  const tests = MOCK_TESTS.map((t) => ({
    ...t,
    status: (twinStatus.get(t.id) as TwinState) || t.status,
  }));

  const passCount = tests.filter((t) => t.status === "pass").length;
  const failCount = tests.filter((t) => t.status === "fail").length;
  const totalCount = tests.length;

  return (
    <div className="glass-card p-6 animate-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Gateway Test Matrix
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Firmware validation results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--accent-emerald)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {passCount}/{totalCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--accent-red)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {failCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track mb-5">
        <div
          className="progress-bar-fill"
          style={{ width: `${(passCount / totalCount) * 100}%` }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Twin ID</th>
              <th>Scenario</th>
              <th>Condition</th>
              <th>Signal</th>
              <th>HR (bpm)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id}>
                <td>
                  <span className="font-mono text-xs" style={{ color: "var(--accent-cyan)" }}>
                    {test.id}
                  </span>
                </td>
                <td style={{ color: "var(--text-primary)" }}>{test.name}</td>
                <td>{test.condition}</td>
                <td>
                  <span className="font-mono text-xs">{test.signalType}</span>
                </td>
                <td>
                  <span className="font-mono">{test.hrBpm}</span>
                </td>
                <td>
                  <span className={`badge ${statusBadge[test.status]}`}>
                    {statusIcon[test.status]} {test.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
