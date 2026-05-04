use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PacketMeta {
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SignalType {
    ECG,
    EMG,
    SpO2,
    EDA,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SimulationPacket {
    pub timestamp_us: u64,
    pub signal_type: SignalType,
    pub voltage_mv: f64,
    pub sample_rate: u32,
    pub metadata: PacketMeta,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonaConfig {
    pub persona_id: Uuid,
    pub hr_bpm: u16,
    pub arrhythmia_type: Option<String>,
    pub noise_level: f32,
    pub age: u8,
    pub sex: char,
    pub conditions: Vec<String>,
    pub hr_min: u16,
    pub hr_max: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestResult {
    pub success: bool,
    pub details: String,
}
