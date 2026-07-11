"use client";
import React, { useMemo } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

export function TestPassChart() {
  const data = {
    labels: ["Passed", "Failed", "Running", "Pending"],
    datasets: [
      {
        data: [3, 1, 1, 1],
        backgroundColor: [
          "rgba(16, 185, 129, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(245, 158, 11, 0.8)",
        ],
        borderColor: [
          "rgba(16, 185, 129, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(245, 158, 11, 1)",
        ],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#94a3b8",
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.95)",
        borderColor: "rgba(56,189,248,0.2)",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className="glass-card p-6 animate-in" style={{ animationDelay: "0.25s" }}>
      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Test Results
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Gateway test pass/fail distribution
      </p>
      <div style={{ height: 220 }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}

export function SignalDistributionChart() {
  const data = {
    labels: ["ECG", "SpO2", "EMG", "EDA"],
    datasets: [
      {
        label: "Signals Generated",
        data: [24, 12, 8, 6],
        backgroundColor: [
          "rgba(34, 211, 238, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(167, 139, 250, 0.7)",
          "rgba(245, 158, 11, 0.7)",
        ],
        borderColor: [
          "rgba(34, 211, 238, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(167, 139, 250, 1)",
          "rgba(245, 158, 11, 1)",
        ],
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 32,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.95)",
        borderColor: "rgba(56,189,248,0.2)",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#64748b", font: { size: 10 }, maxTicksLimit: 5 },
        border: { display: false },
      },
    },
  };

  return (
    <div className="glass-card p-6 animate-in" style={{ animationDelay: "0.35s" }}>
      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Signal Distribution
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Biosignals synthesized by type
      </p>
      <div style={{ height: 220 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
