"use client";
import React from "react";
import Image from "next/image";
import { useSensor } from "@/context/SensorContext";

export default function HumanBodyVisualizer({ activePart }: { activePart: string }) {
  const { sensorData } = useSensor();
  const stress = sensorData.stress;

  let glowClass = "bg-cyan-400/20";
  let bodyFilter = "none";
  let statusText = "STABLE";
  let statusColor = "text-emerald-400";
  let statusBorder = "border-emerald-500/50";
  let pulseSpeed = "1.5s";
  let accentColor = "cyan";

  if (stress <= 30) {
    glowClass = "bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.25)] border-emerald-500/20";
    bodyFilter = "hue-rotate(60deg) saturate(1.5)";
    statusText = "STABLE";
    statusColor = "text-emerald-400";
    statusBorder = "border-emerald-500/50";
    pulseSpeed = "1.6s";
    accentColor = "emerald";
  } else if (stress <= 70) {
    glowClass = "bg-amber-500/10 shadow-[0_0_40px_rgba(251,191,36,0.25)] border-amber-500/20";
    bodyFilter = "hue-rotate(15deg) saturate(1.5)";
    statusText = "ELEVATED";
    statusColor = "text-amber-400";
    statusBorder = "border-amber-500/50";
    pulseSpeed = "0.8s";
    accentColor = "amber";
  } else {
    glowClass = "bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.25)] border-red-500/20";
    bodyFilter = "hue-rotate(-120deg) saturate(2.0)";
    statusText = "CRITICAL";
    statusColor = "text-red-500";
    statusBorder = "border-red-500/50";
    pulseSpeed = "0.4s";
    accentColor = "red";
  }

  const isHighStressOutline = stress > 80;
  const imageFilterStyle = isHighStressOutline 
    ? { filter: `${bodyFilter} drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))`, animation: "hologram_pulse_red 1.0s ease-in-out infinite" }
    : { filter: bodyFilter };

  return (
    <div className={`relative w-full h-[600px] flex items-center justify-center bg-[#020408] overflow-hidden border rounded-[2rem] transition-all duration-700 ${stress <= 30 ? "border-emerald-500/20" : stress <= 70 ? "border-amber-500/20" : "border-red-500/20"}`}>
      {/* Sci-Fi Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${stress <= 30 ? "#10b981" : stress <= 70 ? "#fbbf24" : "#ef4444"} 1px, transparent 0)`, backgroundSize: "32px 32px" }} />
      <div className={`absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent ${stress <= 30 ? "via-emerald-500/40" : stress <= 70 ? "via-amber-500/40" : "via-red-500/40"} to-transparent animate-[scan_6s_linear_infinite]`} />

      {/* LEFT HUD PANEL */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20">
        <div className="flex flex-col gap-1 border-l-2 border-cyan-500/50 pl-3">
          <span className="text-[7px] font-black text-cyan-500/40 uppercase tracking-[0.3em]">Neural Link</span>
          <span className="text-sm font-black text-white font-mono">ENCRYPTED</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
           <div className="text-[8px] font-bold text-cyan-500/50 mb-2 uppercase">Heart Analysis</div>
           <div className="flex items-end gap-1 h-12 w-32">
              {[60, 40, 80, 50, 90, 70, 40, 60].map((h, i) => (
                <div key={i} className={`flex-1 transition-all duration-500 ${stress <= 30 ? "bg-emerald-500/40" : stress <= 70 ? "bg-amber-500/40" : "bg-red-500/40"} animate-pulse`} style={{ height: `${h}%`, animationDelay: `${i * 0.1}s`, animationDuration: pulseSpeed }} />
              ))}
           </div>
        </div>
        <HUDMetric label="SYS_TEMP" value={`${sensorData.temperature.toFixed(1)}°C`} />
        <HUDMetric label="SYS_STRESS" value={`${stress}%`} />
      </div>

      {/* RIGHT HUD PANEL */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20 text-right">
        <div className={`flex flex-col gap-1 border-r-2 ${statusBorder} pr-3 transition-colors duration-500`}>
          <span className="text-[7px] font-black text-cyan-500/40 uppercase tracking-[0.3em]">Sync Status</span>
          <span className={`text-sm font-black font-mono transition-colors duration-500 ${statusColor}`}>{statusText}</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
           <div className="text-[8px] font-bold text-cyan-500/50 mb-2 uppercase text-right">Baro Pressure</div>
           <div className="text-xl font-black text-cyan-400 font-mono italic">{sensorData.pressure.toFixed(1)} hPa</div>
        </div>
        <HUDMetric label="REF_VOLT" value="5.01V" align="right" />
        <HUDMetric label="AMBIENT_HUM" value={`${sensorData.humidity.toFixed(1)}%`} align="right" />
      </div>

      {/* CENTRAL 3D WIREFRAME HUMAN */}
      <div className="relative w-[400px] h-[550px] z-10 flex items-center justify-center animate-[float_5s_ease-in-out_infinite]">
        <div className="absolute inset-0 flex items-center justify-center">
            <div className={`absolute inset-16 rounded-[100px] blur-3xl pointer-events-none transition-all duration-700 ${glowClass}`} />
            <div className="relative w-[380px] h-[520px] transition-all duration-700" style={imageFilterStyle}>
               <Image 
                src="/hologram.png" 
                alt="Holographic Digital Twin" 
                fill
                className="object-contain opacity-80"
                priority
               />
            </div>
        </div>

        {/* Dynamic Holographic Rings at the feet */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-12">
          <div className={`absolute inset-0 rounded-full border-2 bg-transparent transition-colors duration-700 ${stress <= 30 ? "border-emerald-500/20 bg-emerald-500/5" : stress <= 70 ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5"}`} style={{ transform: "rotateX(75deg)" }} />
          <div className={`absolute inset-[-10px] rounded-full border animate-ping transition-colors duration-700 ${stress <= 30 ? "border-emerald-500/10" : stress <= 70 ? "border-amber-500/10" : "border-red-500/10"}`} style={{ transform: "rotateX(75deg)" }} />
        </div>

        {/* Focus Marker for Active System */}
        {activePart === "ECG" && (
           <div className="absolute top-[140px] left-[195px] w-12 h-12 pointer-events-none">
              <div className={`absolute inset-0 rounded-full border-2 animate-ping ${stress <= 30 ? "border-emerald-400/50" : stress <= 70 ? "border-amber-400/50" : "border-red-400/50"}`} style={{ animationDuration: pulseSpeed }} />
              <div className={`absolute inset-4 rounded-full shadow-lg animate-pulse ${stress <= 30 ? "bg-emerald-400 shadow-emerald-500/50" : stress <= 70 ? "bg-amber-400 shadow-amber-500/50" : "bg-red-500 shadow-red-500/50"}`} />
           </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes scan { from { top: -20%; } to { top: 120%; } }
        @keyframes hologram_pulse_red {
          0%, 100% { filter: hue-rotate(-120deg) saturate(2.0) drop-shadow(0 0 4px rgba(239, 68, 68, 0.4)); }
          50% { filter: hue-rotate(-120deg) saturate(2.0) drop-shadow(0 0 18px rgba(239, 68, 68, 0.9)); }
        }
      `}</style>
    </div>
  );
}

function HUDMetric({ label, value, align = "left" }: { label: string, value: string, align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="text-[7px] font-black text-cyan-500/30 uppercase tracking-[0.2em]">{label}</span>
      <span className="text-xs font-black font-mono text-cyan-400/80">{value}</span>
    </div>
  );
}
