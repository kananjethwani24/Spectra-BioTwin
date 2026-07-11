"use client";
import { useEffect, useRef, useState } from "react";
import { useSensor } from "@/context/SensorContext";

interface FallEvent {
  time: string;
  ax: number;
  ay: number;
  az: number;
  magnitude: number;
  lat: string;
  lng: string;
}

// Free-fall threshold: magnitude < 3 m/s² (near weightlessness)
const FREEFALL_THRESHOLD = 3.0;
// Cooldown between detections (ms)
const COOLDOWN_MS = 4000;

export default function FallDetector() {
  const { sensorData } = useSensor();
  const [fallEvent, setFallEvent] = useState<FallEvent | null>(null);
  const [blinking, setBlinking] = useState(false);
  const lastTrigger = useRef<number>(0);
  const blinkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [blinkOn, setBlinkOn] = useState(false);

  useEffect(() => {
    const { accel_x, accel_y, accel_z } = sensorData;
    const magnitude = Math.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2);
    const now = Date.now();

    if (magnitude < FREEFALL_THRESHOLD && now - lastTrigger.current > COOLDOWN_MS) {
      lastTrigger.current = now;

      const time = new Date().toLocaleTimeString();

      // Get coordinates if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setFallEvent({
              time,
              ax: accel_x,
              ay: accel_y,
              az: accel_z,
              magnitude,
              lat: pos.coords.latitude.toFixed(6),
              lng: pos.coords.longitude.toFixed(6),
            });
          },
          () => {
            setFallEvent({
              time,
              ax: accel_x,
              ay: accel_y,
              az: accel_z,
              magnitude,
              lat: "Unavailable",
              lng: "Unavailable",
            });
          },
          { timeout: 3000 }
        );
      } else {
        setFallEvent({
          time,
          ax: accel_x,
          ay: accel_y,
          az: accel_z,
          magnitude,
          lat: "Unavailable",
          lng: "Unavailable",
        });
      }

      // Start red blink for 3 seconds
      setBlinking(true);
      let count = 0;
      blinkInterval.current = setInterval(() => {
        setBlinkOn((v) => !v);
        count++;
        if (count >= 6) {
          clearInterval(blinkInterval.current!);
          setBlinking(false);
          setBlinkOn(false);
        }
      }, 250);
    }
  }, [sensorData]);

  if (!blinking && !fallEvent) return null;

  return (
    <>
      {/* Full screen red blink overlay */}
      {blinking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            pointerEvents: "none",
            background: blinkOn ? "rgba(220, 38, 38, 0.35)" : "transparent",
            transition: "background 0.1s",
          }}
        />
      )}

      {/* Fall detected dialog */}
      {fallEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
          }}
        >
          <div style={{
            background: "#0f1117",
            border: "2px solid #ef4444",
            borderRadius: 16,
            padding: "32px 40px",
            maxWidth: 420,
            width: "90%",
            boxShadow: "0 0 60px rgba(239,68,68,0.4)",
            animation: "fallPulse 0.4s ease",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>🚨</span>
              <div>
                <div style={{ color: "#ef4444", fontWeight: 900, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  FALL DETECTED
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                  MPU6050 free-fall event at {fallEvent.time}
                </div>
              </div>
            </div>

            {/* Accel readings */}
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ color: "#f87171", fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Accelerometer Readings
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "AX", value: fallEvent.ax.toFixed(2) },
                  { label: "AY", value: fallEvent.ay.toFixed(2) },
                  { label: "AZ", value: fallEvent.az.toFixed(2) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ color: "#64748b", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ color: "#f87171", fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>{value}</div>
                    <div style={{ color: "#64748b", fontSize: 9 }}>m/s²</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 10, color: "#94a3b8", fontSize: 10 }}>
                Magnitude: <span style={{ color: "#ef4444", fontWeight: 900 }}>{fallEvent.magnitude.toFixed(2)} m/s²</span>
              </div>
            </div>

            {/* Location */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>
                📍 Location at time of fall
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#e2e8f0" }}>
                Lat: {fallEvent.lat}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#e2e8f0" }}>
                Lng: {fallEvent.lng}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setFallEvent(null)}
              style={{
                width: "100%", padding: "10px", borderRadius: 8,
                background: "#ef4444", border: "none", color: "#fff",
                fontWeight: 900, fontSize: 12, letterSpacing: "0.15em",
                textTransform: "uppercase", cursor: "pointer",
              }}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fallPulse {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
