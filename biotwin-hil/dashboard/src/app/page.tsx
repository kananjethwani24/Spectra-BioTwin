"use client";

import { useSimulationWS } from "@/hooks/useSimulationWS";
import MultiSignalMonitor from "@/components/MultiSignalMonitor";
import ReportViewer from "@/components/ReportViewer";
import ExaminationControl from "@/components/ExaminationControl";
import PersonaGenerator from "@/components/PersonaGenerator";
import HumanBodyVisualizer from "@/components/HumanBodyVisualizer";
import DetailedAnatomyView from "@/components/DetailedAnatomyView";
import HardwareTwin from "@/components/HardwareTwin";
import { useState } from "react";

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
    <div className="min-h-screen bg-[#010204] text-white overflow-x-hidden">
      {/* HUD Header */}
      <nav className="sticky top-0 z-[100] px-10 py-6 flex items-center justify-between border-b border-white/5 bg-[#010204]/80 backdrop-blur-3xl">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center font-black italic">BT</div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.2em] italic">BioTwin <span className="text-cyan-400">Master Suite</span></h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${connected ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_cyan]' : 'bg-red-500'}`} />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{connected ? 'HIL Link Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
           <button onClick={() => setActiveTab("overview")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'overview' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-white/30 hover:text-white'}`}>Sim Monitor</button>
           <button onClick={() => setActiveTab("report")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'report' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'text-white/30 hover:text-white'}`}>FDA Report</button>
        </div>
      </nav>

      <main className="p-10 max-w-[2000px] mx-auto relative z-10">
        {!examining ? (
          <div className="max-w-5xl mx-auto py-20 animate-in"><ExaminationControl onStart={startExamination} /></div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT: HOLOGRAPHIC HUMAN */}
            <div className="col-span-12 xl:col-span-4 animate-in">
               <HumanBodyVisualizer activePart={activeSignal} />
            </div>

            {/* MIDDLE/RIGHT: DATA & HARDWARE & ANATOMY */}
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-8 animate-in">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* DEEP SCAN ANATOMY VIEW */}
                  <div className="h-[550px]">
                    <DetailedAnatomyView system={activeSignal} />
                  </div>

                  {/* HARDWARE TWIN WITH SENSORS */}
                  <div className="h-[550px]">
                    <HardwareTwin />
                  </div>
               </div>

               {/* CARDIAC MULTI-MONITOR */}
               <div className="flex-1">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Cardiac Multi-Channel Analysis</h3>
                    <div className="flex gap-4 text-[8px] font-bold uppercase tracking-widest">
                       <span className="text-cyan-400">ECG</span>
                       <span className="text-emerald-400">PPG</span>
                       <span className="text-amber-400">BCG</span>
                       <span className="text-fuchsia-400">PCG</span>
                    </div>
                 </div>
                 <MultiSignalMonitor packets={packets} />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-card p-6 border-l-4 border-cyan-500/50 bg-cyan-500/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">HIL Engine Terminal</h4>
                    <div className="font-mono text-[10px] text-white/40 leading-relaxed uppercase">
                      [INFO] Hardware Handshake Complete...<br/>
                      [LIVE] A0-A3 Monitoring Active...<br/>
                      <span className="text-cyan-400 font-bold">[SYNC] All virtual sensors reporting data.</span>
                    </div>
                  </div>
                  <div className="glass-card p-6 border-l-4 border-purple-500/50 bg-purple-500/5">
                    <PersonaGenerator />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
           <div className="fixed inset-0 z-[200] bg-[#010204]/95 backdrop-blur-3xl p-12 overflow-auto animate-in">
              <div className="max-w-5xl mx-auto">
                 <button onClick={() => setActiveTab("overview")} className="mb-10 text-cyan-400 font-bold text-xs uppercase tracking-widest hover:underline">← Return to Suite</button>
                 <ReportViewer reportId="exam-101" />
              </div>
           </div>
        )}
      </main>

      <button onClick={() => setExamining(false)} className="fixed bottom-10 right-10 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 transition-all z-[100] shadow-2xl group">
         🏠
      </button>
    </div>
  );
}
