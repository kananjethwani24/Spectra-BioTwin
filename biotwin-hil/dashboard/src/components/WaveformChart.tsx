"use client";
import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

type SimPacket = {
  twin_id: string;
  signal_type: string;
  voltage_mv: number;
  tick_index: number;
  validated: boolean;
};

export default function WaveformChart({ packets }: { packets: SimPacket[] }) {
  // Generate mock ECG-like data when no real packets
  const { labels, dataPoints, hasRealData } = useMemo(() => {
    if (packets.length > 5) {
      return {
        labels: packets.map((_, i) => i.toString()),
        dataPoints: packets.map((p) => p.voltage_mv),
        hasRealData: true,
      };
    }

    // Generate realistic mock ECG waveform
    const mockLabels: string[] = [];
    const mockData: number[] = [];
    const sampleCount = 300;
    const hrBpm = 72;
    const samplesPerBeat = Math.floor(sampleCount / (hrBpm / 20));

    for (let i = 0; i < sampleCount; i++) {
      mockLabels.push(i.toString());
      const beatPos = (i % samplesPerBeat) / samplesPerBeat;

      let v = 0;
      // P wave
      if (beatPos > 0.1 && beatPos < 0.2) {
        v = 0.15 * Math.sin(((beatPos - 0.1) / 0.1) * Math.PI);
      }
      // QRS complex
      else if (beatPos > 0.25 && beatPos < 0.28) {
        v = -0.1 * Math.sin(((beatPos - 0.25) / 0.03) * Math.PI);
      } else if (beatPos > 0.28 && beatPos < 0.34) {
        v = 1.0 * Math.sin(((beatPos - 0.28) / 0.06) * Math.PI);
      } else if (beatPos > 0.34 && beatPos < 0.37) {
        v = -0.2 * Math.sin(((beatPos - 0.34) / 0.03) * Math.PI);
      }
      // T wave
      else if (beatPos > 0.5 && beatPos < 0.65) {
        v = 0.3 * Math.sin(((beatPos - 0.5) / 0.15) * Math.PI);
      }

      // Add noise
      v += (Math.random() - 0.5) * 0.03;
      mockData.push(v);
    }

    return { labels: mockLabels, dataPoints: mockData, hasRealData: false };
  }, [packets]);

  const data = {
    labels,
    datasets: [
      {
        label: "ECG Signal (mV)",
        data: dataPoints,
        borderColor: "var(--accent-cyan)",
        backgroundColor: "rgba(2, 132, 199, 0.04)",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.2,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "rgba(244, 180, 196, 0.4)",
        borderWidth: 1,
        titleColor: "var(--text-primary)",
        bodyColor: "var(--text-secondary)",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.04)",
          drawBorder: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          maxTicksLimit: 5,
        },
        border: { display: false },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  return (
    <div className="glass-card p-6" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            ECG Waveform Monitor
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {hasRealData
              ? `Live stream • ${packets.length} samples`
              : "Simulated waveform • Awaiting WebSocket data"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`pulse-dot ${hasRealData ? "connected" : "disconnected"}`}
          />
          <span
            className="text-xs font-medium"
            style={{ color: hasRealData ? "var(--accent-emerald)" : "var(--accent-amber)" }}
          >
            {hasRealData ? "LIVE" : "DEMO"}
          </span>
        </div>
      </div>
      <div className="chart-container" style={{ height: 220 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
