# Run Project Guide

This guide provides instructions to build, flash, start, and run the BioTwin-HIL workspace components.

## 1. Required Services
Before starting the backend or dashboard, spin up the database and message broker services using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL Database** (`localhost:5432`)
- **Redis Cache** (`localhost:6379`)
- **Wokwi Gateway** (`localhost:9011`) for communicating with the virtual Arduino/ESP32 simulator

---

## 2. Required Environment Variables
Ensure you copy the environment template and set the required API keys and configuration in a `.env` file in the `biotwin-hil` root:

```bash
cp .env.example .env
```

The file should contain:
```ini
# API Keys (set valid keys to enable Gemini and DeepSeek RAG features)
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
AI_BACKEND=api

# Services Config
DATABASE_URL=postgres://postgres:password@localhost:5432/biotwin
REDIS_URL=redis://localhost:6379

# Ports
CORE_RUNNER_PORT=3000
BIO_SYNTHS_PORT=8000
AI_LAYER_API_KEY=your_api_key_here
```

---

## 3. Backend Startup Commands

### Start the Python Bio-Synths (FastAPI) Backend
Run this from the `biotwin-hil` directory:

Using `uv` (recommended):
```bash
uv run python python/bio-synths/src/main.py
```

Or using standard `python`:
```bash
py python/bio-synths/src/main.py
```

### Start the Rust Core Runner (Optional)
Run this from the `biotwin-hil` directory to compile and run the auxiliary Rust server:
```bash
cargo run --bin core-runner
```

---

## 4. Dashboard Startup Commands
Navigate to the `dashboard` folder, install the node dependencies, and run the Next.js development server:

```bash
cd dashboard
npm install
npm run dev
```

To build and run the optimized production dashboard:
```bash
npm run build
npm start
```

---

## 5. Firmware Build and Flash Commands

The firmware (`firmware/main.ino`) is designed for an ESP32-S3 using the standard Arduino toolchain.

### Option A: Using Arduino IDE (GUI)
1. Open the file [firmware/main.ino](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/firmware/main.ino) in the Arduino IDE.
2. Open the Board Manager and choose **ESP32S3 Dev Module** (from ESP32 board package version `2.0.x` or later).
3. Connect your ESP32-S3 via USB.
4. Select the corresponding serial port in **Tools -> Port**.
5. Click **Verify / Compile** (Checkmark icon) to build.
6. Click **Upload** (Arrow icon) to flash the compiled firmware.

### Option B: Using Arduino CLI (Command Line)
Install `arduino-cli` and run:

```bash
# Compile firmware
arduino-cli compile --fqbn esp32:esp32:esp32s3 firmware/main.ino

# Upload/Flash firmware to target serial port (e.g. COM3 or /dev/ttyACM0)
arduino-cli upload -p <PORT> --fqbn esp32:esp32:esp32s3 firmware/main.ino
```

---

## 6. Expected URLs
When all services are running, the application can be accessed at the following addresses:

| Component | URL / Address | Description |
| :--- | :--- | :--- |
| **Next.js Dashboard UI** | `http://localhost:3000` | The primary interactive clinical HUD |
| **FastAPI Backend (docs)** | `http://localhost:8000/docs` | Interactive Swagger API documentation |
| **FastAPI Backend (root)** | `http://localhost:8000` | Base endpoint for REST / WebSocket endpoints |
| **Core Runner (Rust)** | `http://localhost:3000/health` | Rust gateway health check |
| **PostgreSQL Database** | `localhost:5432` | DB service for storing Twin registries |
| **Redis Broker** | `localhost:6379` | Key-value store / job queuing broker |


py -m platformio run --target upload --project-dir "Spectra-biomed/biotwin-hil/firmware"

py -m platformio device monitor --port COM3 --baud 115200 --project-dir "Spectra-biomed/biotwin-hil/firmware"