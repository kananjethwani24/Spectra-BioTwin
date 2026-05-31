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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
