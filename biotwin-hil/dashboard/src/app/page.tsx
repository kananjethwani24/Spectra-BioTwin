"use client";

import { useSimulationWS } from "@/hooks/useSimulationWS";
import WaveformChart from "@/components/WaveformChart";
import ReportViewer from "@/components/ReportViewer";
import ExaminationControl from "@/components/ExaminationControl";
import PersonaGenerator from "@/components/PersonaGenerator";
import HumanBodyVisualizer from "@/components/HumanBodyVisualizer";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const { connected, packets } = useSimulationWS("ws://localhost:8000/ws");
  const [examining, setExamining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "report">("overview");
  const [activeSignal, setActiveSignal] = useState("ECG");

  const startExamination = async (code: string, signal: string) => {
    setActiveSignal(signal);
    setExamining(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/personas/generate?condition=Normal&complexity=3`, { method: "POST" });
      const persona = await res.json();
      await fetch("http://localhost:8000/api/v1/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_type: signal, persona_params: persona, duration_s: 30, sample_rate: 50 })
      });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white overflow-x-hidden">
      {/* HUD Header */}
      <nav className="sticky top-0 z-[100] px-10 py-6 flex items-center justify-between border-b border-white/5 bg-[#020408]/80 backdrop-blur-3xl">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center font-black italic">BT</div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.2em] italic">BioTwin <span className="text-cyan-400">Master Suite</span></h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_cyan]' : 'bg-red-500'}`} />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{connected ? 'AI Link Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
           <button onClick={() => setActiveTab("overview")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'overview' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-white/30 hover:text-white'}`}>Sim Monitor</button>
           <button onClick={() => setActiveTab("report")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'report' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-white/30 hover:text-white'}`}>FDA Report</button>
        </div>
      </nav>

      <main className="p-10 max-w-[1920px] mx-auto">
        {!examining ? (
          <div className="max-w-4xl mx-auto py-20 animate-in"><ExaminationControl onStart={startExamination} /></div>
        ) : (
          <div className="grid grid-cols-12 gap-10">
            {/* COLUMN 1: EXACT HOLOGRAPHIC HUMAN */}
            <div className="col-span-12 xl:col-span-5 animate-in">
               <HumanBodyVisualizer activePart={activeSignal} />
            </div>

            {/* COLUMN 2: HARDWARE & DATA */}
            <div className="col-span-12 xl:col-span-7 flex flex-col gap-8 animate-in">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* REAL ARDUINO UNO IMAGE */}
                  <div className="glass-card p-8 border-t-2 border-cyan-500/50 bg-cyan-500/5 relative overflow-hidden">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-6">Hardware Link : Arduino Uno</h3>
                     <div className="relative aspect-video flex items-center justify-center p-4">
                        <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                           {/* Simplified Professional Arduino SVG */}
                           <rect x="20" y="20" width="360" height="260" rx="15" fill="#00979d" />
                           <rect x="0" y="80" width="60" height="40" fill="#ddd" rx="2" /> {/* USB */}
                           <rect x="300" y="100" width="60" height="100" fill="#222" rx="2" /> {/* Atmega */}
                           <rect x="50" y="30" width="300" height="15" fill="#222" /> {/* Pins Top */}
                           <rect x="50" y="255" width="300" height="15" fill="#222" /> {/* Pins Bottom */}
                           <text x="200" y="150" fill="white" fontSize="24" fontWeight="bold" opacity="0.2" textAnchor="middle">ARDUINO UNO</text>
                           <circle cx="360" cy="50" r="6" fill="#0f0" className="animate-pulse" />
                        </svg>
                     </div>
                     <div className="flex justify-between items-center mt-4">
                        <div className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">IO_Port: COM3</div>
                        <div className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Protocol: SERIAL_UART</div>
                     </div>
                  </div>

                  {/* ANALYSIS METRICS */}
                  <div className="glass-card p-8 border-t-2 border-purple-500/50 bg-purple-500/5">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-6">Real-Time Synthesis</h3>
                     <PersonaGenerator />
                  </div>
               </div>

               {/* LIVE MONITOR */}
               <WaveformChart packets={packets} />
               
               <div className="glass-card p-6 border-l-4 border-cyan-500/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">HIL Engine Terminal</h4>
                  <div className="font-mono text-[10px] text-white/40 leading-relaxed uppercase">
                    [00:00:01] Initializing Digital Twin Simulation...<br/>
                    [00:00:02] Loading AI Personas via Gemini 2.5 Pro...<br/>
                    [00:00:03] Injecting synthetic biosignal to A0...<br/>
                    <span className="text-cyan-400 font-bold">[00:00:04] Stream active: {activeSignal} mode enabled.</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
           <div className="fixed inset-0 z-[200] bg-[#020408]/95 backdrop-blur-3xl p-12 overflow-auto animate-in">
              <div className="max-w-5xl mx-auto">
                 <button onClick={() => setActiveTab("overview")} className="mb-10 text-cyan-400 font-bold text-xs uppercase tracking-widest">← Return to Suite</button>
                 <ReportViewer reportId="exam-101" />
              </div>
           </div>
        )}
      </main>

      <button onClick={() => setExamining(false)} className="fixed bottom-10 right-10 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 transition-all z-[100] shadow-2xl">
         🏠
      </button>
    </div>
  );
}
