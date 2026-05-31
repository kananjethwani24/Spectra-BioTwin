"use client";
import React, { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function MultiSignalMonitor({ packets }: { packets: any[] }) {
  const chartRef = useRef<any>(null);

  // Extract signals from the latest packet
  const latestPacket = packets[packets.length - 1]?.signals || {
    ECG: Array(50).fill(0),
    PPG: Array(50).fill(0),
    BCG: Array(50).fill(0),
    PCG: Array(50).fill(0)
  };

  const labels = Array.from({ length: 100 }, (_, i) => i);

  const createDataset = (label: string, data: number[], color: string) => ({
    label,
    data: data,
    borderColor: color,
    backgroundColor: `${color}33`,
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.4,
  });

  const options = (title: string, color: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { 
        display: true, 
        text: title, 
        color: color, 
        font: { size: 10, weight: 'bold' as const },
        align: 'start' as const,
        padding: { bottom: 10 }
      },
    },
    scales: {
      x: { display: false },
      y: {
        display: true,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { display: false },
        min: -1.5,
        max: 1.5,
      },
    },
    animation: { duration: 0 },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
      <div className="glass-card p-4 border-l-2 border-cyan-500 bg-cyan-500/5">
        <Line options={options("ECG - Electrical Activity", "#22d3ee")} data={{ labels, datasets: [createDataset("ECG", latestPacket.ECG, "#22d3ee")] }} />
      </div>
      <div className="glass-card p-4 border-l-2 border-emerald-500 bg-emerald-500/5">
        <Line options={options("PPG - Optical Pulse", "#10b981")} data={{ labels, datasets: [createDataset("PPG", latestPacket.PPG, "#10b981")] }} />
      </div>
      <div className="glass-card p-4 border-l-2 border-amber-500 bg-amber-500/5">
        <Line options={options("BCG - Ballistocardiogram", "#f59e0b")} data={{ labels, datasets: [createDataset("BCG", latestPacket.BCG, "#f59e0b")] }} />
      </div>
      <div className="glass-card p-4 border-l-2 border-fuchsia-500 bg-fuchsia-500/5">
        <Line options={options("PCG - Heart Sounds", "#d946ef")} data={{ labels, datasets: [createDataset("PCG", latestPacket.PCG, "#d946ef")] }} />
      </div>
    </div>
  );
}
