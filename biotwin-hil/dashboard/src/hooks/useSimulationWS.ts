"use client";
import { useState, useEffect } from "react";

export function useSimulationWS(url: string) {
  const [connected, setConnected] = useState(false);
  const [packets, setPackets] = useState<any[]>([]);
  const [twinStatus, setTwinStatus] = useState("OFFLINE");
  const [sensorData, setSensorData] = useState<any>({
    heart_rate: 72,
    spo2: 98,
    temperature: 36.5,
    humidity: 40.0,
    pressure: 1013.25,
    spectral_status: "disabled",
    spectral_channels: [],
    health_score: 98.0
  });

  useEffect(() => {
    // Fallback REST fetch on mount
    fetch("http://localhost:8000/api/v1/sensor-data")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch initial sensor data");
      })
      .then((data) => {
        if (data && typeof data === "object" && "heart_rate" in data) {
          setSensorData(data);
        }
      })
      .catch((err) => console.error(err));

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setTwinStatus("CONNECTED");
      console.log("HIL Bridge Connected");
    };

    ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        if (packet.type === "SIGNAL_DATA") {
          setPackets((prev) => {
            const newPackets = [...prev, packet];
            // Keep only the last 10 packets to prevent memory leaks
            return newPackets.slice(-10);
          });
        } else if (packet.type === "SENSOR_DATA") {
          setSensorData(packet.data);
        }
      } catch (err) {
        console.error("Error parsing WebSocket packet:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTwinStatus("OFFLINE");
    };

    return () => ws.close();
  }, [url]);

  return { connected, packets, twinStatus, sensorData };
}
