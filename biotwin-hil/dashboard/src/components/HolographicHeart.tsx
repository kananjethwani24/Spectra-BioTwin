"use client";
import React from "react";

export default function HolographicHeart({ bpm = 80 }: { bpm?: number }) {
  const beatDuration = 60 / bpm;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-3xl overflow-hidden group">
      {/* 3D Space Container */}
      <div className="relative w-64 h-64 perspective-[1000px]">
        
        {/* The "3D" Heart Model (SVG with depth gradients) */}
        <div className={`relative w-full h-full animate-[heartbeat_${beatDuration}s_ease-in-out_infinite] transition-all duration-500`}>
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <defs>
              <radialGradient id="heartGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#450a0a" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Heart Chambers (3D stylized) */}
            <path 
              d="M100 170 C 60 140, 20 100, 20 60 A 40 40 0 0 1 100 40 A 40 40 0 0 1 180 60 C 180 100, 140 140, 100 170 Z" 
              fill="url(#heartGrad)" 
              filter="url(#glow)"
              className="opacity-90"
            />
            
            {/* Aorta & Vessels (Blender-style highlights) */}
            <path d="M90 40 L90 20 A10 10 0 0 1 110 20 L110 40" stroke="#ef4444" strokeWidth="15" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d="M120 45 L135 25" stroke="#ef4444" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" />

              {/* Glowing Veins (Dynamic) */}
              <path d="M60 80 Q 100 100, 140 80" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
              <path d="M70 110 Q 100 130, 130 110" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Holographic HUD Overlays */}
        <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite] scale-110" />
        <div className="absolute inset-[-20px] border border-cyan-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
        
        {/* Floating Data Points */}
        <div className="absolute top-0 right-0 p-2 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-mono text-red-400">
           LV_PRESSURE: 120mmHg
        </div>
        <div className="absolute bottom-0 left-0 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-[8px] font-mono text-cyan-400">
           O2_SAT: 98%
        </div>
      </div>

      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          15% { transform: scale(1.15); filter: brightness(1.4); }
          30% { transform: scale(1.05); filter: brightness(1.2); }
          45% { transform: scale(1.1); filter: brightness(1.3); }
        }
      `}</style>
    </div>
  );
}
