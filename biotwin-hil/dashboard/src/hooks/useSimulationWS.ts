"use client";
import { useState, useEffect } from "react";

export function useSimulationWS(url: string) {
  const [connected, setConnected] = useState(false);
  const [packets, setPackets] = useState<any[]>([]);
  const [twinStatus, setTwinStatus] = useState("OFFLINE");

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setTwinStatus("CONNECTED");
      console.log("HIL Bridge Connected");
    };

    ws.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      if (packet.type === "SIGNAL_DATA") {
        setPackets((prev) => {
          const newPackets = [...prev, packet];
          // Keep only the last 10 packets to prevent memory leaks
          return newPackets.slice(-10);
        });
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTwinStatus("OFFLINE");
    };

    return () => ws.close();
  }, [url]);

  return { connected, packets, twinStatus };
}
