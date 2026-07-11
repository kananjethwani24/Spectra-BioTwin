"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export interface SensorData {
  ir: number;
  red: number;
  temperature: number;
  humidity: number;
  pressure: number;
  stress: number;
}

export interface StressHistoryPoint {
  time: string;
  stress: number;
}

interface SensorContextType {
  sensorData: SensorData;
  connected: boolean;
  stressHistory: StressHistoryPoint[];
  lastUpdated: Date | null;
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

// Generate synthetic baseline history so chart never shows empty
function generateBaselineHistory(): StressHistoryPoint[] {
  const now = new Date();
  const points: StressHistoryPoint[] = [];
  for (let i = 59; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 1000);
    const timeStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    // Gentle sinusoidal baseline stress ~15-25%
    const stress = Math.round(18 + 6 * Math.sin((i / 10) * Math.PI) + Math.random() * 4);
    points.push({ time: timeStr, stress });
  }
  return points;
}

export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [sensorData, setSensorData] = useState<SensorData>({
    ir: 0,
    red: 0,
    temperature: 36.5,
    humidity: 40,
    pressure: 1013.25,
    stress: 0,
  });
  const [connected, setConnected] = useState(false);
  const [stressHistory, setStressHistory] = useState<StressHistoryPoint[]>(generateBaselineHistory);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      // Connect to WebSocket on the backend port 8000
      socket = new WebSocket("ws://localhost:8000/ws");

      socket.onopen = () => {
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === "SENSOR_DATA" && packet.data) {
            const raw = packet.data;
            const newData: SensorData = {
              ir: typeof raw.ir === "number" ? raw.ir : 0,
              red: typeof raw.red === "number" ? raw.red : 0,
              temperature: typeof raw.temperature === "number" ? raw.temperature : 36.5,
              humidity: typeof raw.humidity === "number" ? raw.humidity : 40,
              pressure: typeof raw.pressure === "number" ? raw.pressure : 1013.25,
              stress: typeof raw.stress === "number" ? raw.stress : 0,
            };

            setSensorData(newData);
            const now = new Date();
            setLastUpdated(now);

            // Construct timestamp label
            const timeStr = now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            // Append to stress history, keep last 60 seconds (60 data points at ~1Hz)
            setStressHistory((prev) => {
              const updated = [...prev, { time: timeStr, stress: newData.stress }];
              return updated.slice(-60);
            });
          }
        } catch (err) {
          console.error("Error parsing telemetry packet:", err);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        // Attempt reconnection after 3 seconds
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        if (socket) socket.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        // Remove onclose handler to prevent infinite reconnect loop on unmount
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return (
    <SensorContext.Provider value={{ sensorData, connected, stressHistory, lastUpdated }}>
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error("useSensor must be used within a SensorProvider");
  }
  return context;
}
