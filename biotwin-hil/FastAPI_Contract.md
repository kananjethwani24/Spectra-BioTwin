# FastAPI Contract

This document defines the interface contract for the FastAPI `/synthesize` endpoint, which is to be implemented by P2.

## Endpoint

**POST** `/synthesize`

## Request Payload (JSON)

The endpoint expects a JSON payload containing the following fields:

- `signal_type`: A string representing the signal type to synthesize (e.g., `"ECG"`, `"EMG"`, `"SpO2"`, `"EDA"`).
- `persona_params`: An object representing the persona configuration (maps to `PersonaConfig` struct).
- `duration_s`: A number (float or integer) specifying the duration of the signal in seconds.
- `sample_rate`: An integer specifying the sample rate in Hz.

Example Request Body:
```json
{
  "signal_type": "ECG",
  "persona_params": {
    "persona_id": "123e4567-e89b-12d3-a456-426614174000",
    "hr_bpm": 72,
    "arrhythmia_type": null,
    "noise_level": 0.05,
    "age": 30,
    "sex": "M",
    "conditions": ["healthy"],
    "hr_min": 60,
    "hr_max": 100
  },
  "duration_s": 10.0,
  "sample_rate": 250
}
```

## Response Payload

The endpoint must return a **binary f64 array** containing the generated signal voltages.
Each element in the binary response should be a 64-bit IEEE 754 float in little-endian format.

Content-Type for response: `application/octet-stream`

## Note
These types map directly to the `types.rs` definition. Please refer to `crates/core-runner/src/types.rs` for the source of truth. All shared Rust types in this file are final.
