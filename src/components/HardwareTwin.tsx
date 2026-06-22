"use client";
import React from "react";
import { useSensor } from "@/context/SensorContext";

export default function HardwareTwin() {
  const { sensorData } = useSensor();
  const stress = sensorData.stress;

  const stressColor = stress <= 30 ? "#10b981" : stress <= 70 ? "#fbbf24" : "#ef4444";
  const stressLabel = stress <= 30 ? "STABLE" : stress <= 70 ? "ELEVATED" : "CRITICAL";
  const stressBg = stress <= 30
    ? "rgba(16,185,129,0.08)"
    : stress <= 70
    ? "rgba(251,191,36,0.08)"
    : "rgba(239,68,68,0.08)";
  const stressBorder = stress <= 30
    ? "rgba(16,185,129,0.35)"
    : stress <= 70
    ? "rgba(251,191,36,0.35)"
    : "rgba(239,68,68,0.35)";

  const SENSORS = [
    { id: "ECG", pin: "A0", color: "#22d3ee", label: "A0" },
    { id: "PPG", pin: "A1", color: "#10b981", label: "A1" },
    { id: "BCG", pin: "A2", color: "#f59e0b", label: "A2" },
    { id: "PCG", pin: "A3", color: "#d946ef", label: "A3" },
  ];

  return (
    <div className="glass-card p-6 border-t-2 border-slate-500/50 bg-[#0a0c10] h-full flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">WOKWI VIRTUAL HIL REPLICA</h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Live Stress Widget — replaces spectral banner */}
      <div
        className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-500"
        style={{
          background: stressBg,
          border: `1px solid ${stressBorder}`,
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30">
            Potentiometer · Stress Level
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-black font-mono transition-all duration-300"
              style={{ color: stressColor }}
            >
              {stress}
            </span>
            <span className="text-xs font-bold" style={{ color: stressColor }}>%</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest transition-colors duration-300"
            style={{ color: stressColor }}
          >
            {stressLabel}
          </span>
          {/* Gauge bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${stress}%`,
                background: stressColor,
                boxShadow: `0 0 8px ${stressColor}`,
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="relative flex-1 flex flex-col items-center">
        {/* TOP ROW: 4 POTENTIOMETERS (DIALS) */}
        <div className="flex justify-between w-full px-10 relative z-20">
          {SENSORS.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
               {/* Potentiometer Body */}
               <div className="w-14 h-14 bg-[#1e293b] border-2 border-slate-700 rounded-lg flex items-center justify-center relative shadow-xl">
                  <div className="w-10 h-10 rounded-full bg-slate-300 border-4 border-slate-400 flex items-center justify-center">
                     <div className="w-1 h-4 bg-slate-600 rounded-full -rotate-45" /> {/* Dial Marker */}
                  </div>
                  {/* Pin labels */}
                  <div className="absolute -bottom-1 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-sm" />
                    <div className="w-1.5 h-1.5 bg-black rounded-sm" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-sm" />
                  </div>
               </div>
               <span className="text-[8px] font-black text-slate-500 mt-2 uppercase">{s.id}</span>
            </div>
          ))}
        </div>

        {/* WIRING HARNESS (Perfect replica of the 2nd image) */}
        <div className="absolute top-10 left-0 w-full h-32 pointer-events-none z-10">
           {/* Power Rail (Red) */}
           <div className="absolute top-6 left-[15%] w-[70%] h-[2px] bg-red-500/40" />
           {/* Ground Rail (Black) */}
           <div className="absolute top-8 left-[15%] w-[70%] h-[2px] bg-black" />
           
           {/* Individual Signal Wires */}
           {SENSORS.map((s, i) => (
             <div key={i} className="absolute h-24 border-l-2" style={{ 
               borderColor: s.color, 
               left: `${20 + (i * 20.5)}%`, 
               top: '40px',
               boxShadow: `0 0 10px ${s.color}44`
             }} />
           ))}
        </div>

        {/* ARDUINO UNO (Exact Pose) */}
        <div className="mt-16 relative w-64 h-44 z-20">
           <svg viewBox="0 0 250 170" className="w-full h-full">
              {/* Board Body */}
              <rect x="0" y="0" width="250" height="170" rx="4" fill="#00979d" />
              <rect x="5" y="50" width="35" height="45" fill="#c0c0c0" rx="1" /> {/* USB */}
              <rect x="0" y="110" width="25" height="35" fill="#333" rx="1" /> {/* Power Jack */}
              <rect x="200" y="60" width="35" height="70" fill="#222" rx="2" /> {/* ATMEGA */}
              
              {/* ANALOG IN Header */}
              <rect x="150" y="160" width="80" height="10" fill="#222" />
              {SENSORS.map((s, i) => (
                <rect key={i} x={158 + (i * 12.5)} y={162} width="4" height="6" fill={s.color} className="animate-pulse" />
              ))}

              <text x="125" y="30" fill="white" fontSize="14" fontWeight="black" opacity="0.1" textAnchor="middle">ARDUINO UNO</text>
              <circle cx="230" cy="15" r="4" fill="#4ade80" />
           </svg>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center text-[8px] font-mono text-slate-500 border-t border-white/5 pt-4">
        <span>VCC: 5.00V</span>
        <span className="animate-pulse text-emerald-500 font-bold">● HIL_ACTIVE</span>
        <span>GND: 0.00V</span>
      </div>
    </div>
  );
}
