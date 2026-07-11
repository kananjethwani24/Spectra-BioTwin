from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
import numpy as np
import uvicorn
import sys
import os
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.join(os.path.dirname(__file__), '../../ai-layer'))
from persona_gen import generate_persona # type: ignore
import httpx
import asyncio
import serial
import threading
import json

app = FastAPI(title="BioTwin-HIL P4", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PersonaConfig(BaseModel):
    persona_id: Optional[str] = None
    hr_bpm: int = 80
    arrhythmia_type: Optional[str] = None
    noise_level: float = 0.05
    age: int = 45
    sex: str = "M"
    conditions: List[str] = []
    hr_min: int = 60
    hr_max: int = 100

class SynthesizeRequest(BaseModel):
    signal_type: str
    persona_params: PersonaConfig
    duration_s: float = Field(..., gt=0.0)
    sample_rate: int = Field(..., gt=0)

class SensorPayload(BaseModel):
    heart_rate: int
    spo2: int
    temperature: float
    humidity: float
    pressure: float
    stress: int = 0
    ir: Optional[int] = None
    red: Optional[int] = None
    spectral_status: Optional[str] = "disabled"
    spectral_channels: Optional[List[int]] = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def generate_cardiac_suite(hr_bpm, fs, duration):
    t = np.linspace(0, duration, int(fs * duration))
    hr_hz = hr_bpm / 60.0
    
    # ECG: P-QRS-T complex simulation
    ecg = np.zeros_like(t)
    for i in range(int(duration * hr_hz)):
        t_start = i / hr_hz
        idx = (t >= t_start) & (t < t_start + 0.6)
        tt = t[idx] - t_start
        ecg[idx] = 1.2 * np.exp(-((tt - 0.2)**2) / 0.001) - 0.2 * np.exp(-((tt - 0.4)**2) / 0.01) # QRS + T
        
    # PPG: Smooth pulse wave (Oxygenation)
    ppg = 0.5 * np.sin(2 * np.pi * hr_hz * t - 0.2) + 0.5
    ppg += 0.05 * np.random.randn(len(t))
    
    # BCG: Micro-vibration (Ballistocardiography)
    bcg = 0.1 * np.sin(10 * 2 * np.pi * hr_hz * t) * np.exp(-((t % (1/hr_hz)) / 0.1))
    
    # PCG: Heart Sounds (Phonocardiography)
    pcg = np.zeros_like(t)
    for i in range(int(duration * hr_hz)):
        t_start = i / hr_hz
        pcg[(t >= t_start + 0.05) & (t < t_start + 0.15)] = 0.5 * np.sin(2 * np.pi * 100 * t[(t >= t_start + 0.05) & (t < t_start + 0.15)]) # S1
        pcg[(t >= t_start + 0.35) & (t < t_start + 0.45)] = 0.3 * np.sin(2 * np.pi * 150 * t[(t >= t_start + 0.35) & (t < t_start + 0.45)]) # S2

    return ecg, ppg, bcg, pcg

@app.post("/api/v1/personas/generate")
async def api_generate_persona(condition: str = "Normal", complexity: int = 3):
    try:
        persona = generate_persona(condition, complexity)
        return persona
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/v1/synthesize")
async def api_synthesize(request: SynthesizeRequest):
    hr = request.persona_params.hr_bpm
    fs = request.sample_rate
    dur = request.duration_s
    
    ecg, ppg, bcg, pcg = generate_cardiac_suite(hr, fs, dur)
    
    # Broadcast all 4 signals
    await manager.broadcast({
        "type": "SIGNAL_DATA",
        "signals": {
            "ECG": ecg.tolist()[:100],
            "PPG": ppg.tolist()[:100],
            "BCG": bcg.tolist()[:100],
            "PCG": pcg.tolist()[:100]
        }
    })
    
    return {"status": "streaming"}

@app.get("/api/v1/spectral")
async def get_spectral_data():
    return {
        "spectral_status": "disabled",
        "channels": []
    }

latest_sensor_data = {
    "heart_rate": 72,
    "spo2": 98,
    "temperature": 36.5,
    "humidity": 40.0,
    "pressure": 1013.25,
    "stress": 0,
    "spectral_status": "disabled",
    "spectral_channels": [],
    "health_score": 98.0
}

@app.get("/api/v1/sensor-data")
async def get_sensor_data():
    global latest_sensor_data
    return latest_sensor_data

@app.post("/api/v1/ingest")
async def ingest_sensor_data(payload: SensorPayload):
    global latest_sensor_data
    warnings = []
    
    if payload.spectral_status == "disabled" or not payload.spectral_channels:
        warnings.append("Spectral sensor data absent or disabled. Falling back to basic metrics.")
        
    # Generate health score
    health_score = 100.0
    if payload.heart_rate > 100 or payload.heart_rate < 60:
        health_score -= 10
    if payload.spo2 < 95:
        health_score -= 15
    if payload.temperature > 37.5 or payload.temperature < 36.0:
        health_score -= 10
    health_score = max(0.0, health_score)

    latest_sensor_data = {
        "heart_rate": payload.heart_rate,
        "spo2": payload.spo2,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "pressure": payload.pressure,
        "stress": payload.stress,
        "ir": payload.ir,
        "red": payload.red,
        "spectral_status": payload.spectral_status or "disabled",
        "spectral_channels": payload.spectral_channels or [],
        "health_score": health_score
    }
    
    # Broadcast updated sensor data via WebSocket
    await manager.broadcast({
        "type": "SENSOR_DATA",
        "data": latest_sensor_data
    })
    
    return {
        "status": "success",
        "stored_data": latest_sensor_data,
        "health_score": health_score,
        "warnings": warnings
    }

# ── AI Insights ───────────────────────────────────────────────────────────────

import google.generativeai as genai # type: ignore

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@app.get("/api/v1/insights")
async def get_ai_insights():
    d = latest_sensor_data
    hr       = d.get("heart_rate", 0)
    spo2     = d.get("spo2", 98)
    temp     = d.get("temperature", 36.5)
    humidity = d.get("humidity", 40)
    pressure = d.get("pressure", 1013)
    score    = d.get("health_score", 100)
    stress_val = d.get("stress", 0)

    # Determine required stress bullet
    if stress_val < 30:
        stress_bullet = "Patient state stable. No significant stress detected."
    elif stress_val <= 70:
        stress_bullet = "Moderate stress indicators observed. Monitoring recommended."
    else:
        stress_bullet = "Elevated stress state detected. Consider intervention."

    # Fallback rule-based insights if no API key
    if not GEMINI_API_KEY:
        insights = []
        insights.append("Heart rhythm " + ("irregular — monitor closely" if hr > 100 or hr < 50 else "stable"))
        insights.append("SpO₂ " + ("critically low — oxygen needed" if spo2 < 90 else "low — monitor" if spo2 < 95 else "within normal range"))
        insights.append("Temperature " + ("elevated — possible fever" if temp > 37.5 else "normal"))
        insights.append("Ambient humidity " + ("elevated" if humidity > 60 else "low — hydration advised" if humidity < 30 else "normal"))
        insights.append(stress_bullet)
        return {"insights": insights, "source": "rule-based"}

    prompt = f"""You are a clinical AI assistant analyzing real-time biosensor data from a digital twin.

Current sensor readings:
- Heart Rate: {hr} bpm
- SpO₂: {spo2}%
- Temperature: {temp:.1f}°C
- Humidity: {humidity:.0f}%
- Pressure: {pressure:.0f} hPa
- Health Score: {score:.0f}/100

Generate exactly 4 short clinical insight bullets (excluding stress assessment). Each bullet should be one sentence.
Focus on: rhythm assessment, oxygenation, temperature, environmental factors.
Return ONLY a JSON array of 4 strings. No preamble, no markdown."""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        insights = json.loads(text)
        if not isinstance(insights, list):
            raise ValueError("Not a list")
        insights = insights[:4]
        insights.append(stress_bullet)
        return {"insights": insights, "source": "gemini"}
    except Exception as e:
        insights = []
        insights.append("Heart rhythm " + ("irregular — monitor closely" if hr > 100 or hr < 50 else "stable"))
        insights.append("SpO₂ " + ("critically low — oxygen needed" if spo2 < 90 else "low — monitor" if spo2 < 95 else "within normal range"))
        insights.append("Temperature " + ("elevated — possible fever" if temp > 37.5 else "normal"))
        insights.append("Ambient humidity " + ("elevated" if humidity > 60 else "low — hydration advised" if humidity < 30 else "normal"))
        insights.append(stress_bullet)
        return {"insights": insights, "source": "rule-based"}

# ── Serial Reader ─────────────────────────────────────────────────────────────

SERIAL_PORT = os.environ.get("SERIAL_PORT", "COM3")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "115200"))

def serial_reader():
    """Reads JSON lines from ESP32 serial port and POSTs to /api/v1/ingest."""
    while True:
        try:
            with serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=2) as ser:
                print(f"[SERIAL] Connected to {SERIAL_PORT}")
                while True:
                    line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not line or not line.startswith("{"):
                        continue
                    try:
                        data = json.loads(line)
                        print(f"[SERIAL] Parsed: HR={data.get('heart_rate',0)} IR={data.get('ir',0)}")
                        # Map ESP32 keys to API payload keys
                        payload = {
                            "heart_rate": int(data.get("hr", data.get("heart_rate", 0))),
                            "spo2":       int(data.get("spo2", 98)),
                            "temperature": float(data.get("temp", data.get("temperature", 36.5))),
                            "humidity":   float(data.get("humidity", 40.0)),
                            "pressure":   float(data.get("pressure", 1013.25)),
                            "stress":     int(data.get("stress", 0)),
                            "ir":         int(data.get("ir", 0)) if data.get("ir") else None,
                            "red":        int(data.get("red", 0)) if data.get("red") else None,
                        }
                        import requests
                        requests.post("http://localhost:8000/api/v1/ingest", json=payload, timeout=1)
                    except Exception as e:
                        print(f"[SERIAL] Parse error: {e} — line: {line}")
        except Exception as e:
            print(f"[SERIAL] Port error: {e}. Retrying in 3s...")
            import time
            time.sleep(3)

# Start serial reader in background thread
serial_thread = threading.Thread(target=serial_reader, daemon=True)
serial_thread.start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
