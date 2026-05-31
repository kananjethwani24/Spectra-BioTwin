"use client";
import React from "react";
import Image from "next/image";
import InteractiveHeart3D from "./InteractiveHeart3D";

const DIAGRAM_MAP: Record<string, { src: string; title: string; subtitle: string; is3D?: boolean }> = {
  ECG: {
    src: "/heart_diag.png",
    title: "INTERACTIVE CARDIAC MODEL",
    subtitle: "Full 3D Orbit Control Active",
    is3D: true
  },
  EMG: {
    src: "/muscle_diag.png",
    title: "MUSCULAR SYSTEM",
    subtitle: "Skeletal Muscle Fibers & Motor Units"
  },
  SpO2: {
    src: "/oxygen_diag.png",
    title: "RESPIRATORY MATRIX",
    subtitle: "Gas Exchange & Oxygenated Blood Path"
  },
  EDA: {
    src: "/skin_diag.png",
    title: "DERMAL STRUCTURE",
    subtitle: "Skin Layers & Nerve Ending Distribution"
  }
};

export default function DetailedAnatomyView({ system }: { system: string }) {
  const config = DIAGRAM_MAP[system] || DIAGRAM_MAP.ECG;

  return (
    <div className="glass-card p-6 border-t-2 border-emerald-500/50 bg-[#020408] h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">
            {config.is3D ? "3D_ENGINE: " : "Deep Scan: "}{config.title}
          </h3>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">
            {config.subtitle}
          </p>
        </div>
        <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase border border-emerald-500/30">
          {config.is3D ? "INTERACTIVE" : "HI-RES"}
        </div>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden bg-black/40 border border-white/5 group">
        {config.is3D ? (
          <InteractiveHeart3D />
        ) : (
          <Image
            src={config.src}
            alt={config.title}
            fill
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-105"
          />
        )}
        
        {/* HUD Scan Line (Only for non-3D) */}
        {!config.is3D && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-full h-1/3 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent absolute top-0 animate-[anatomy_scan_4s_linear_infinite]" />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes anatomy_scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
      `}</style>
    </div>
  );
}
