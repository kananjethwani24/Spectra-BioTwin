"use client";
import React from "react";
import Image from "next/image";

export default function HumanBodyVisualizer({ activePart }: { activePart: string }) {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center bg-[#020408] overflow-hidden border border-cyan-500/10 rounded-[2rem]">
      {/* Sci-Fi Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-[scan_6s_linear_infinite]" />

      {/* LEFT HUD PANEL (Exact match to screenshot) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20">
        <div className="flex flex-col gap-1 border-l-2 border-cyan-500/50 pl-3">
          <span className="text-[7px] font-black text-cyan-500/40 uppercase tracking-[0.3em]">Neural Link</span>
          <span className="text-sm font-black text-white font-mono">ENCRYPTED</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
           <div className="text-[8px] font-bold text-cyan-500/50 mb-2 uppercase">Heart Analysis</div>
           <div className="flex items-end gap-1 h-12">
              {[60, 40, 80, 50, 90, 70, 40, 60].map((h, i) => (
                <div key={i} className="flex-1 bg-cyan-500/40 animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
           </div>
        </div>
        <HUDMetric label="SYS_TEMP" value="36.5°C" />
        <HUDMetric label="BP_STAT" value="120/80" />
      </div>

      {/* RIGHT HUD PANEL (Exact match to screenshot) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20 text-right">
        <div className="flex flex-col gap-1 border-r-2 border-cyan-500/50 pr-3">
          <span className="text-[7px] font-black text-cyan-500/40 uppercase tracking-[0.3em]">Sync Status</span>
          <span className="text-sm font-black text-emerald-400 font-mono">100% OK</span>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
           <div className="text-[8px] font-bold text-cyan-500/50 mb-2 uppercase text-right">Oxygen Saturation</div>
           <div className="text-xl font-black text-cyan-400 font-mono italic">98.2%</div>
        </div>
        <HUDMetric label="REF_VOLT" value="5.01V" align="right" />
        <HUDMetric label="HIL_SYNC" value="ACTIVE" align="right" />
      </div>

      {/* CENTRAL 3D WIREFRAME HUMAN (Generated Asset) */}
      <div className="relative w-[400px] h-[550px] z-10 flex items-center justify-center animate-[float_5s_ease-in-out_infinite]">
        <div className="absolute inset-0 flex items-center justify-center">
           <Image 
            src="/hologram.png" 
            alt="Holographic Digital Twin" 
            width={400} 
            height={550} 
            className="object-contain opacity-80 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]"
           />
        </div>

        {/* Dynamic Holographic Rings at the feet */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 bg-cyan-500/5" style={{ transform: "rotateX(75deg)" }} />
          <div className="absolute inset-[-10px] rounded-full border border-cyan-500/10 animate-ping" style={{ transform: "rotateX(75deg)" }} />
        </div>

        {/* Focus Marker for Active System */}
        {activePart === "ECG" && (
           <div className="absolute top-[140px] left-[195px] w-12 h-12 pointer-events-none">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-cyan-400 shadow-[0_0_15px_cyan] animate-pulse" />
           </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes scan { from { top: -20%; } to { top: 120%; } }
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
