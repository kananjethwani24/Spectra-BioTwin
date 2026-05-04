import { useState, useEffect, useRef } from 'react';

export type SimPacket = {
  twin_id: string;
  signal_type: string;
  voltage_mv: number;
  tick_index: number;
  validated: boolean;
};

export type TwinState = "pending" | "running" | "pass" | "fail";

export type JobProgress = {
  completed: number;
  total: number;
  eta_s: number;
};

export function useSimulationWS(url: string) {
  const [packets, setPackets] = useState<SimPacket[]>([]);
  const [twinStatus, setTwinStatus] = useState<Map<string, TwinState>>(new Map());
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "packet.stream":
              setPackets((prev) => {
                const updated = [...prev, data.payload];
                return updated.slice(-500);
              });
              break;
            case "twin.status":
              setTwinStatus((prev) => {
                const newMap = new Map(prev);
                newMap.set(data.payload.twin_id, data.payload.status);
                return newMap;
              });
              break;
            case "job.progress":
              setJobProgress(data.payload);
              break;
            case "validator.reject":
              console.log("Validator rejected:", data.payload);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error("Failed to parse WS message", error);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        timeoutId = setTimeout(connect, 2000);
      };

      ws.onerror = (error) => {
        // Suppress console.error so Next.js doesn't show the error overlay when backend is down
        // console.warn("WS error. Reconnecting...");
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { packets, twinStatus, jobProgress, connected };
}
