"use client";
import React, { useState, useEffect } from "react";
import { useSensor } from "@/context/SensorContext";

export default function HardwareDebugPanel() {
  const { sensorData, connected, lastUpdated } = useSensor();
  const [packetLogs, setPacketLogs] = useState<string[]>([]);

  // Log raw packets when data updates
  useEffect(() => {
    if (lastUpdated) {
      const logStr = `[${lastUpdated.toLocaleTimeString()}] RECV: ${JSON.stringify(sensorData)}`;
      setPacketLogs((prev) => [logStr, ...prev].slice(0, 15));
    }
  }, [sensorData, lastUpdated]);

  return (
    <div className="glass-card p-6 border-t-2 border-cyan-500/50 bg-[#0a0d14] rounded-2xl flex flex-col gap-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            ESP32 HARDWARE DIAGNOSTICS
          </h3>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">
            Real-time Telemetry Debugging Hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-red-500"
            }`}
          />
          <span
            className={`text-[9px] font-black uppercase tracking-widest ${
              connected ? "text-emerald-400" : "text-red-500"
            }`}
          >
            {connected ? "LINK STABLE" : "LINK DISCONNECTED"}
          </span>
        </div>
      </div>

      {/* Grid of Raw Sensor Values */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <DebugStat label="IR Value" value={sensorData.ir} unit="raw" color="#22d3ee" />
        <DebugStat label="Red Value" value={sensorData.red} unit="raw" color="#ef4444" />
        <DebugStat label="Temperature" value={sensorData.temperature.toFixed(2)} unit="°C" color="#fbbf24" />
        <DebugStat label="Humidity" value={sensorData.humidity.toFixed(2)} unit="%" color="#a78bfa" />
        <DebugStat label="Pressure" value={sensorData.pressure.toFixed(2)} unit="hPa" color="#f472b6" />
        <DebugStat label="Potentiometer" value={`${sensorData.stress}`} unit="%" color="#34d399" />
      </div>

      {/* Terminal logs for incoming packets */}
      <div>
        <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">
          Live Telemetry Packet Logs
        </h4>
        <div className="bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-[9px] text-slate-400 h-32 overflow-y-auto flex flex-col gap-1 select-all">
          {packetLogs.length === 0 ? (
            <div className="text-slate-600 italic">[Awaiting first hardware packet...]</div>
          ) : (
            packetLogs.map((log, i) => (
              <div key={i} className={i === 0 ? "text-cyan-400 font-bold" : "text-slate-400"}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-[8px] font-mono text-slate-600 pt-2 border-t border-white/5">
        <span>INTERFACE: WEBSOCKET</span>
        <span>BAUD: 115200</span>
        <span>PORT: COM3/Serial Bridge</span>
      </div>
    </div>
  );
}

function DebugStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: string;
}) {
  return (
    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-1 transition-all duration-300 hover:border-white/10">
      <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm font-black font-mono" style={{ color }}>
        {value}
        <span className="text-[8px] text-slate-500 font-normal ml-1">{unit}</span>
      </span>
    </div>
  );
}
