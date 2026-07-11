"use client";
import React from "react";
import { Bar } from "react-chartjs-2";
import { useSensor } from "@/context/SensorContext";
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import type { TwinState, SensorMode } from "@/hooks/useTwinState";

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend);

type Props = {
  twinState: TwinState;
  sensorMode: SensorMode;
};

function conditionColor(condition: string): string {
  if (condition === "STEMI" || condition === "Atrial Fibrillation") return "#ef4444";
  if (condition === "Normal") return "#10b981";
  return "#f59e0b";
}


function StressCard() {
  const { sensorData } = useSensor();
  const stress = sensorData.stress;

  const color =
    stress <= 30 ? "#059669" : stress <= 70 ? "#d97706" : "#dc2626";
  const label =
    stress <= 30 ? "Stable" : stress <= 70 ? "Elevated" : "Critical";
  const borderClass =
    stress <= 30
      ? "border-emerald-500/60 bg-emerald-500/5"
      : stress <= 70
      ? "border-amber-500/60 bg-amber-500/5"
      : "border-red-500/60 bg-red-500/5";

  return (
    <div className={`glass-card p-5 flex flex-col justify-between border-l-4 transition-colors duration-500 ${borderClass}`}>
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Stress</span>
        <span className="text-base">🧠</span>
      </div>
      <div className="mt-4">
        <span
          className="text-2xl font-black font-mono transition-colors duration-300"
          style={{ color }}
        >
          {stress}
        </span>
        <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">%</span>
      </div>
      <div className="mt-2">
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stress}%`, background: color }}
          />
        </div>
        <div className="text-[7px] uppercase mt-1 font-bold transition-colors duration-300" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

export default function VitalsMonitor({ twinState, sensorMode }: Props) {
  const {
    heartRate,
    spo2,
    temperature,
    humidity,
    healthScore,
    spectralStatus,
    spectralChannels,
    condition,
  } = twinState;

  const isSpectralEnabled =
    spectralStatus === "enabled" && spectralChannels && spectralChannels.length > 0;

  const chartData = React.useMemo(() => ({
    labels: ["F1 (415nm)", "F2 (445nm)", "F3 (480nm)", "F4 (515nm)", "F5 (555nm)", "F6 (590nm)", "F7 (630nm)", "F8 (680nm)"],
    datasets: [
      {
        label: "Spectral Intensity (counts)",
        data: isSpectralEnabled ? spectralChannels : Array(8).fill(0),
        backgroundColor: [
          "rgba(139, 92, 246, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(59, 130, 246, 0.7)",
          "rgba(6, 182, 212, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(234, 179, 8, 0.7)",
          "rgba(249, 115, 22, 0.7)",
          "rgba(239, 68, 68, 0.7)",
        ],
        borderColor: [
          "rgba(139, 92, 246, 1)",
          "rgba(99, 102, 241, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(6, 182, 212, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(234, 179, 8, 1)",
          "rgba(249, 115, 22, 1)",
          "rgba(239, 68, 68, 1)",
        ],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  }), [isSpectralEnabled, spectralChannels]);

  const chartOptions = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
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
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 10, weight: "bold" as const } },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#64748b", font: { size: 9 } },
        border: { display: false },
      },
    },
  }), []);

return (
    <div className="flex flex-col gap-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">
          HIL TELEMETRY ENGINE &amp; SENSORS
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sensor mode badge */}
          {sensorMode === "REAL_SENSOR_MODE" ? (
            <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-[8px] font-black uppercase tracking-widest text-accent-emerald border border-emerald-200">
              REAL SENSOR
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full bg-sky-55 text-[8px] font-black uppercase tracking-widest text-accent-cyan border border-sky-200" style={{ background: "rgba(2, 132, 199, 0.05)" }}>
              SIMULATION
            </div>
          )}
          {/* Condition badge */}
          <div
            className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border"
            style={{
              background: `${conditionColor(condition)}18`,
              borderColor: `${conditionColor(condition)}44`,
              color: conditionColor(condition),
            }}
          >
            {condition}
          </div>
          <span className="pulse-dot connected" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-accent-emerald">
            RECEIVING VITAL DATA
          </span>
        </div>
      </div>

      {/* VITALS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Heart Rate */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-sky-300 bg-sky-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Heart Rate</span>
            <span className="text-base animate-pulse">❤️</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-sky-600">{heartRate.toFixed(0)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">bpm</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-emerald-300 bg-emerald-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">SpO2</span>
            <span className="text-base">🩸</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-emerald-600">{spo2.toFixed(1)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">%</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-amber-300 bg-amber-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Temperature</span>
            <span className="text-base">🌡️</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-amber-600">{temperature.toFixed(1)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-purple-300 bg-purple-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Humidity</span>
            <span className="text-base">💦</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-purple-600">{humidity.toFixed(1)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">%</span>
          </div>
        </div>

        {/* Health Score */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-sky-300 bg-sky-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Health Score</span>
            <span className="text-base">⚡</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-sky-600">{healthScore.toFixed(0)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">/100</span>
          </div>
        </div>

        {/* Pressure */}
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-sky-300 bg-sky-50/10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Pressure</span>
            <span className="text-base">🌬️</span>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-sky-600">{twinState.pressure.toFixed(1)}</span>
            <span className="text-[9px] font-bold text-text-muted ml-1 uppercase">hPa</span>
          </div>
        </div>

        {/* Live Stress Card */}
        <StressCard />
      </div>



      {/* Spectral Graph */}
      {isSpectralEnabled && (
        <div className="glass-card p-6 border-t-2 border-purple-300 bg-white animate-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-600">
                AS7341 SPECTROMETER CHANNELS
              </h4>
              <p className="text-[8px] text-text-muted uppercase tracking-widest mt-1">
                Visual &amp; Near-Infrared Spectrum Analysis
              </p>
            </div>
            <div className="px-2.5 py-1 rounded bg-purple-50 text-purple-600 text-[8px] font-bold uppercase border border-purple-200">
              AS7341 ACTIVE
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
