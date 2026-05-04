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
import httpx # for streaming to gateway
import asyncio

app = FastAPI(title="BioTwin-HIL P2", version="1.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PersonaConfig(BaseModel):
    persona_id: uuid.UUID | str
    hr_bpm: int = Field(..., ge=0)
    arrhythmia_type: Optional[str] = None
    noise_level: float = Field(..., ge=0.0)
    age: int = Field(..., ge=0)
    sex: str
    conditions: List[str]
    hr_min: int = Field(..., ge=0)
    hr_max: int = Field(..., ge=0)

class SynthesizeRequest(BaseModel):
    signal_type: str
    persona_params: PersonaConfig
    duration_s: float = Field(..., gt=0.0)
    sample_rate: int = Field(..., gt=0)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        # Accepting all origins to prevent 403
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
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/v1/personas/generate")
async def api_generate_persona(condition: str = "Normal", complexity: int = 3):
    try:
        persona = generate_persona(condition, complexity)
        return persona
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/v1/synthesize")
async def api_synthesize(request: SynthesizeRequest):
    # Mock signal generation for the hackathon
    duration = request.duration_s
    fs = request.sample_rate
    t = np.linspace(0, duration, int(fs * duration))
    
    # Generate a pulse-like signal
    hr_hz = request.persona_params.hr_bpm / 60.0
    signal = 0.5 * np.sin(2 * np.pi * hr_hz * t) + 0.2 * np.random.randn(len(t))
    
    # Broadcast to dashboard
    await manager.broadcast({
        "type": "SIGNAL_DATA",
        "signal_type": request.signal_type,
        "data": signal.tolist()[:100] # Send first chunk for visualization
    })
    
    # --- HIL Bridge ---
    async def stream_to_wokwi():
        try:
            async with httpx.AsyncClient() as client:
                for val in signal:
                    voltage = (val + 1.0) * 2.5
                    # Note: This requires wokwi-gateway running
                    # await client.post("http://localhost:9011/pin/34", json={"voltage": voltage})
                    await asyncio.sleep(0.02)
        except:
            pass

    asyncio.create_task(stream_to_wokwi())
    
    return Response(content=signal.astype('<f8').tobytes(), media_type="application/octet-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
