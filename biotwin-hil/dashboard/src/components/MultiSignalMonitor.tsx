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
    ECG: Array(100).fill(0),
    PPG: Array(100).fill(0),
    BCG: Array(100).fill(0),
    PCG: Array(100).fill(0)
  };

  const labels = React.useMemo(() => Array.from({ length: 100 }, (_, i) => i), []);

  const createDataset = React.useCallback((label: string, data: number[], color: string) => ({
    label,
    data: data,
    borderColor: color,
    backgroundColor: `${color}33`,
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.4,
  }), []);

  const options = React.useCallback((title: string, color: string) => ({
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
  }), []);

  const ecgOptions = React.useMemo(() => options("ECG - Electrical Activity", "#22d3ee"), [options]);
  const ppgOptions = React.useMemo(() => options("PPG - Optical Pulse", "#10b981"), [options]);
  const bcgOptions = React.useMemo(() => options("BCG - Ballistocardiogram", "#f59e0b"), [options]);
  const pcgOptions = React.useMemo(() => options("PCG - Heart Sounds", "#d946ef"), [options]);

  const ecgData = React.useMemo(() => ({ labels, datasets: [createDataset("ECG", latestPacket.ECG, "#22d3ee")] }), [labels, latestPacket.ECG, createDataset]);
  const ppgData = React.useMemo(() => ({ labels, datasets: [createDataset("PPG", latestPacket.PPG, "#10b981")] }), [labels, latestPacket.PPG, createDataset]);
  const bcgData = React.useMemo(() => ({ labels, datasets: [createDataset("BCG", latestPacket.BCG, "#f59e0b")] }), [labels, latestPacket.BCG, createDataset]);
  const pcgData = React.useMemo(() => ({ labels, datasets: [createDataset("PCG", latestPacket.PCG, "#d946ef")] }), [labels, latestPacket.PCG, createDataset]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
      <div className="glass-card p-4 border-l-2 border-cyan-500 bg-cyan-500/5">
        <Line options={ecgOptions} data={ecgData} />
      </div>
      <div className="glass-card p-4 border-l-2 border-emerald-500 bg-emerald-500/5">
        <Line options={ppgOptions} data={ppgData} />
      </div>
      <div className="glass-card p-4 border-l-2 border-amber-500 bg-amber-500/5">
        <Line options={bcgOptions} data={bcgData} />
      </div>
      <div className="glass-card p-4 border-l-2 border-fuchsia-500 bg-fuchsia-500/5">
        <Line options={pcgOptions} data={pcgData} />
      </div>
    </div>
  );
}
