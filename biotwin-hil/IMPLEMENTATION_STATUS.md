# Hardware Migration Implementation Status

This document tracks the migration status of the Spectra-BioTwin system to support configurations without the AS7341 spectral sensor, utilizing the MAX30102 (vitals) and BME280 (environment) sensors instead.

## 1. Firmware Changes Completed
- **Driver Integration**: Added libraries for `Adafruit_BME280` and `MAX30105`.
- **Telemetry Streaming**: Refactored the core loop to sample environment data (temperature, humidity, pressure) and vitals (heart rate, SpO2).
- **JSON Serialization**: Constructed and serialized the sensor payload to a standard JSON string:
  ```json
  {
    "heart_rate": 72,
    "spo2": 98,
    "temperature": 24.5,
    "humidity": 45.2,
    "pressure": 1013.25,
    "spectral_status": "disabled"
  }
  ```
- **Serial Stream**: Configured serial data output at 2-second intervals.

## 2. Backend Changes Completed
- **Telemetry Schema**: Defined the `SensorPayload` schema matching the serialized firmware payload.
- **Ingestion Endpoint**: Created `/api/v1/ingest` to receive telemetry, generate warning/status flags for disabled spectral sensors, and calculate a patient **Health Score** dynamically.
- **REST Endpoint**: Implemented `/api/v1/sensor-data` GET endpoint to serve the latest telemetry on demand.
- **WebSocket Broadcast**: Updated the WebSocket manager to broadcast `"SENSOR_DATA"` updates to all active UI clients upon ingestion.

## 3. Dashboard Changes Completed
- **WebSocket Synchronization**: Updated `useSimulationWS.ts` to ingest `"SENSOR_DATA"` WebSocket packets and fetch initial data on mount.
- **Telemetry Indicators**: Implemented `VitalsMonitor.tsx` to display real-time values for:
  - **Heart Rate** (bpm)
  - **SpO2** (%)
  - **Temperature** (°C)
  - **Humidity** (%)
  - **Health Score** (/100)
- **Spectral Sensor Card**: Added a dedicated card to indicate the spectral sensor's status:
  - Displays `Spectral Sensor - Status: Disabled` when no spectral telemetry is present.
  - Dynamically switches to `Active` when spectral telemetry is present.
- **Conditional Spectral Graph**: Configured the dashboard to hide the 8-channel spectral bar chart entirely when `spectral_status` is `"disabled"`, preventing empty graphs or layout gaps.
- **Crash Prevention**: Utilized default fallback values and validation checks to ensure no frontend crashes occur if sensor data contains null/undefined fields.

## 4. Remaining Tasks
- None. All features are fully implemented, integrated, and verified.

## 5. Build Errors
- **None**: Next.js production build completed successfully with zero TypeScript, ESLint, or runtime compilation errors.

---

## 6. Files Modified
- **Firmware**:
  - [firmware/main.ino](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/firmware/main.ino)
- **Backend**:
  - [python/bio-synths/src/main.py](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/python/bio-synths/src/main.py)
- **Dashboard**:
  - [dashboard/src/hooks/useSimulationWS.ts](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/dashboard/src/hooks/useSimulationWS.ts)
  - [dashboard/src/app/page.tsx](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/dashboard/src/app/page.tsx)
  - [dashboard/src/components/HardwareTwin.tsx](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/dashboard/src/components/HardwareTwin.tsx)
  - [dashboard/src/components/VitalsMonitor.tsx](file:///c:/Users/kanan/Desktop/Biomedicine%20hackathon/Spectra-biomed/biotwin-hil/dashboard/src/components/VitalsMonitor.tsx) (New file)
