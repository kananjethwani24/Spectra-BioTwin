"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useHeartRateCalc } from "./useHeartRateCalc";
import { useSpO2Calc } from "./useSpO2Calc";
import { useSensor } from "@/context/SensorContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SensorMode = "SIMULATION_MODE" | "REAL_SENSOR_MODE";

export type Condition =
  | "Normal"
  | "Atrial Fibrillation"
  | "STEMI"
  | "Bradycardia"
  | "Tachycardia"
  | "Long QT Syndrome";

export type Scenario =
  | "none"
  | "exercise"
  | "fever"
  | "low_oxygen"
  | "drug_admin"
  | "dehydration";

export type Timeline = "1h" | "6h" | "12h" | "24h";

export type TwinState = {
  // Patient identity
  patientId: string;
  age: number;
  gender: string;
  weight: number;
  condition: Condition;
  arrhythmia: boolean;
  // Vitals (single source of truth)
  heartRate: number;
  spo2: number;
  temperature: number;
  humidity: number;
  pressure: number;
  // Derived scores
  stressIndex: number;
  cardiacRisk: number;
  respiratoryHealth: number;
  recoveryScore: number;
  healthScore: number;
  // Disease classifier output
  conditionProbabilities: Record<string, number>;
  // Mode
  sensorMode: SensorMode;
  spectralStatus: string;
  spectralChannels: number[];
  // Raw optical sensor values
  ir: number;
  red: number;
};

export type PersonaPayload = {
  persona_id: string;
  display_name: string;
  age: number;
  sex: string;
  hr_bpm: number;
  hr_min: number;
  hr_max: number;
  conditions: string[];
  noise_level: number;
  arrhythmia_type: string | null;
  weight_kg?: number;
  signal_params?: {
    ecg?: { pr_interval_ms: number; qrs_duration_ms: number; qt_interval_ms: number };
    spo2?: { baseline_pct: number; variability: number };
  };
};

export type RawSensorData = {
  // ESP32 direct fields
  ir?: number;
  red?: number;
  stress?: number;
  // Mapped fields (from Python bridge or direct)
  heart_rate: number;
  spo2: number;
  temperature: number;
  humidity: number;
  pressure: number;
  spectral_status?: string;
  spectral_channels?: number[];
  health_score?: number;
};

export type PredictionResult = {
  predicted: TwinState;
  risk_delta: number;
  confidence: number;
  warnings: string[];
};

// ── Condition vitals map ───────────────────────────────────────────────────────

type ConditionVitals = {
  hrMin: number;
  hrMax: number;
  spo2Min: number;
  spo2Max: number;
  tempMin: number;
  tempMax: number;
  cardiacRiskBase: number;
  arrhythmia: boolean;
};

const CONDITION_VITALS: Record<Condition, ConditionVitals> = {
  Normal: { hrMin: 60, hrMax: 90, spo2Min: 97, spo2Max: 99, tempMin: 36.2, tempMax: 37.2, cardiacRiskBase: 5, arrhythmia: false },
  "Atrial Fibrillation": { hrMin: 120, hrMax: 170, spo2Min: 94, spo2Max: 97, tempMin: 36.5, tempMax: 37.5, cardiacRiskBase: 45, arrhythmia: true },
  STEMI: { hrMin: 90, hrMax: 130, spo2Min: 90, spo2Max: 95, tempMin: 36.5, tempMax: 38.0, cardiacRiskBase: 80, arrhythmia: false },
  Bradycardia: { hrMin: 35, hrMax: 55, spo2Min: 95, spo2Max: 98, tempMin: 36.0, tempMax: 37.0, cardiacRiskBase: 25, arrhythmia: false },
  Tachycardia: { hrMin: 100, hrMax: 160, spo2Min: 95, spo2Max: 98, tempMin: 36.5, tempMax: 38.0, cardiacRiskBase: 30, arrhythmia: false },
  "Long QT Syndrome": { hrMin: 60, hrMax: 90, spo2Min: 96, spo2Max: 99, tempMin: 36.0, tempMax: 37.5, cardiacRiskBase: 35, arrhythmia: true },
};

// ── Scenario effects ───────────────────────────────────────────────────────────

type EffectVector = {
  hr_rate: number;
  spo2_rate: number;
  temp_rate: number;
  stress_rate: number;
  cardiac_risk_rate: number;
  resp_health_rate: number;
  recovery_rate: number;
  confidence: number;
  warnings: string[];
};

const SCENARIO_EFFECTS: Record<Scenario, EffectVector> = {
  none: {
    hr_rate: 0, spo2_rate: 0, temp_rate: 0, stress_rate: -1,
    cardiac_risk_rate: -0.5, resp_health_rate: 0.2, recovery_rate: 1,
    confidence: 95, warnings: [],
  },
  exercise: {
    hr_rate: 30, spo2_rate: -1, temp_rate: 1.5, stress_rate: 10,
    cardiac_risk_rate: 5, resp_health_rate: -3, recovery_rate: -5,
    confidence: 88, warnings: ["Elevated cardiac load detected", "Monitor SpO₂ during peak exertion"],
  },
  fever: {
    hr_rate: 10, spo2_rate: -2, temp_rate: 2.0, stress_rate: 15,
    cardiac_risk_rate: 8, resp_health_rate: -5, recovery_rate: -8,
    confidence: 82, warnings: ["Hyperthermia risk above 39.5°C", "Dehydration cascade likely"],
  },
  low_oxygen: {
    hr_rate: 15, spo2_rate: -8, temp_rate: 0.2, stress_rate: 20,
    cardiac_risk_rate: 12, resp_health_rate: -10, recovery_rate: -10,
    confidence: 79, warnings: ["Critical SpO₂ drop predicted", "Hypoxia risk — recommend O₂ supplementation"],
  },
  drug_admin: {
    hr_rate: -12, spo2_rate: 1, temp_rate: -0.5, stress_rate: -20,
    cardiac_risk_rate: -10, resp_health_rate: 5, recovery_rate: 8,
    confidence: 85, warnings: ["Bradycardia risk if HR < 50 bpm", "Monitor blood pressure response"],
  },
  dehydration: {
    hr_rate: 18, spo2_rate: -1, temp_rate: 0.8, stress_rate: 12,
    cardiac_risk_rate: 9, resp_health_rate: -4, recovery_rate: -12,
    confidence: 81, warnings: ["Plasma volume reduction expected", "Electrolyte imbalance risk"],
  },
};

const TIMELINE_HOURS: Record<Timeline, number> = {
  "1h": 1,
  "6h": 6,
  "12h": 12,
  "24h": 24,
};

// ── Pure helpers ───────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function predictPhysiology(
  condition: Condition,
  current: { heartRate: number; spo2: number; temperature: number; stressIndex: number; cardiacRisk: number },
  scenario: Scenario,
  hours: number
): {
  heartRate: number;
  spo2: number;
  temperature: number;
  stressIndex: number;
  cardiacRisk: number;
  warnings: string[];
} {
  let hr = current.heartRate;
  let spo2 = current.spo2;
  let temp = current.temperature;
  let stress = current.stressIndex;
  let risk = current.cardiacRisk;
  let warnings: string[] = [];

  const decay = hours > 24 ? 0.4 : hours > 1 ? 0.75 : 1.0;

  if (condition === "Normal") {
    if (scenario === "none") {
      hr = hr + rand(-1, 1) * hours * 0.1;
      spo2 = clamp(spo2 + rand(-0.2, 0.2) * hours * 0.1, 97, 99);
      temp = clamp(temp + rand(-0.05, 0.05) * hours * 0.1, 36.3, 37.0);
      stress = clamp(stress - 2 * hours * decay, 5, 20);
      risk = clamp(risk - 1 * hours * decay, 2, 8);
    } else if (scenario === "exercise") {
      hr = clamp(130 + (hr - 130) * Math.exp(-hours * 2), 60, 150);
      spo2 = clamp(spo2 + 0.5 * hours * decay, 96, 99);
      temp = clamp(temp + 0.8 * hours * decay, 36.5, 37.6);
      stress = clamp(stress + 15 * hours * decay, 30, 70);
      risk = clamp(risk + 2 * hours * decay, 5, 15);
      warnings.push("Increased cardiac workload from physical exertion.");
    } else if (scenario === "fever") {
      temp = clamp(39.2 - (39.2 - temp) * Math.exp(-hours * 0.5), 37.5, 40.0);
      hr = clamp(hr + (temp - 36.5) * 10 * hours * decay, 60, 110);
      spo2 = clamp(spo2 - 0.5 * hours * decay, 94, 98);
      stress = clamp(stress + 10 * hours * decay, 20, 50);
      risk = clamp(risk + 5 * hours * decay, 5, 25);
      warnings.push("Fever-induced tachycardia. Monitor core temperature.");
    } else if (scenario === "low_oxygen") {
      spo2 = clamp(86 - (86 - spo2) * Math.exp(-hours * 0.3), 75, 92);
      hr = clamp(hr + 15 * hours * decay, 60, 115);
      stress = clamp(stress + 20 * hours * decay, 40, 80);
      risk = clamp(risk + 8 * hours * decay, 10, 35);
      warnings.push("Hypoxia detected. Oxygen saturation below normal limits.");
    } else if (scenario === "drug_admin") {
      hr = clamp(58 - (58 - hr) * Math.exp(-hours * 0.5), 50, 70);
      stress = clamp(stress - 15 * hours * decay, 5, 15);
      risk = clamp(risk - 2 * hours * decay, 2, 10);
      warnings.push("Beta-blocker rate control active. Heart rate reduced.");
    } else if (scenario === "dehydration") {
      hr = clamp(hr + 8 * hours * decay, 60, 105);
      temp = clamp(temp + 0.4 * hours * decay, 36.5, 38.0);
      stress = clamp(stress + 8 * hours * decay, 15, 45);
      risk = clamp(risk + 4 * hours * decay, 5, 20);
      warnings.push("Mild hypovolemic strain. Hydration recommended.");
    }
  }

  else if (condition === "Atrial Fibrillation") {
    if (scenario === "none") {
      hr = clamp(hr + 5 * hours * decay, 120, 155);
      spo2 = clamp(spo2 - 0.3 * hours * decay, 92, 96);
      stress = clamp(stress + 5 * hours * decay, 35, 65);
      risk = clamp(45 + 1.5 * hours, 45, 75);
      warnings.push("Persistent irregular tachycardia. Risk of thromboembolic stroke.");
      if (hours >= 12) {
        warnings.push("Prolonged high rate increases cardiomyopathy and heart failure risk.");
      }
    } else if (scenario === "exercise") {
      hr = clamp(175 + (hr - 175) * Math.exp(-hours * 2), 140, 195);
      spo2 = clamp(spo2 - 2 * hours * decay, 88, 93);
      stress = clamp(stress + 25 * hours * decay, 65, 95);
      risk = clamp(risk + 10 * hours * decay, 65, 95);
      warnings.push("CRITICAL: Extreme rapid ventricular response under load!");
      warnings.push("High risk of acute hemodynamic collapse or syncope.");
    } else if (scenario === "fever") {
      hr = clamp(hr + 12 * hours * decay, 130, 185);
      temp = clamp(39.0 - (39.0 - temp) * Math.exp(-hours * 0.5), 37.0, 39.8);
      spo2 = clamp(spo2 - 1.5 * hours * decay, 90, 94);
      risk = clamp(risk + 8 * hours * decay, 55, 88);
      warnings.push("Fever compounding tachyarrhythmia. Severe metabolic strain.");
    } else if (scenario === "low_oxygen") {
      spo2 = clamp(82 - (82 - spo2) * Math.exp(-hours * 0.3), 72, 90);
      hr = clamp(hr + 8 * hours * decay, 130, 175);
      risk = clamp(risk + 12 * hours * decay, 60, 92);
      warnings.push("AF combined with hypoxic environment. High risk of myocardial ischemia.");
    } else if (scenario === "drug_admin") {
      hr = clamp(82 - (82 - hr) * Math.exp(-hours * 0.6), 65, 95);
      spo2 = clamp(spo2 + 0.5 * hours * decay, 95, 98);
      stress = clamp(stress - 15 * hours * decay, 10, 35);
      risk = clamp(20 + (risk - 20) * Math.exp(-hours * 0.6), 15, 35);
      warnings.push("Therapeutic rate control established via beta-blocker.");
      warnings.push("Ventricular rate stabilized. Risk of cardiomyopathy resolved.");
    } else if (scenario === "dehydration") {
      hr = clamp(hr + 10 * hours * decay, 130, 170);
      risk = clamp(risk + 6 * hours * decay, 50, 80);
      warnings.push("Dehydration worsens irregular tachycardia. Elevates cardiac workload.");
    }
  }

  else if (condition === "STEMI") {
    if (scenario === "drug_admin") {
      hr = clamp(85 - (85 - hr) * Math.exp(-hours * 0.5), 80, 100);
      spo2 = clamp(spo2 + 0.5 * hours * decay, 90, 94);
      stress = clamp(stress - 10 * hours * decay, 40, 70);
      risk = clamp(70 + (risk - 70) * Math.exp(-hours * 0.5), 65, 85);
      warnings.push("Beta-blocker/vasodilation therapy provides minor myocardial unloading.");
      warnings.push("WARNING: Acute myocardial infarction still in progress. Immediate PCI required.");
    } else {
      if (scenario === "exercise") {
        hr = clamp(140 + (hr - 140) * Math.exp(-hours * 2), 110, 160);
        spo2 = clamp(spo2 - 4 * hours * decay, 75, 88);
        stress = clamp(stress + 30 * hours * decay, 80, 100);
        risk = clamp(99, 99, 100);
        warnings.push("CRITICAL ALERT: Physical exertion during acute myocardial infarction!");
        warnings.push("Extremely high risk of cardiogenic shock, ventricular fibrillation, or death.");
      } else if (scenario === "low_oxygen") {
        spo2 = clamp(78 - (78 - spo2) * Math.exp(-hours * 0.3), 65, 85);
        hr = clamp(hr + 10 * hours * decay, 105, 140);
        risk = clamp(99, 99, 100);
        warnings.push("CRITICAL ALERT: Severe hypoxia compounding acute STEMI.");
        warnings.push("Myocardial necrosis accelerated. High risk of complete pump failure.");
      } else {
        const mult = scenario === "fever" ? 1.5 : scenario === "dehydration" ? 1.2 : 1.0;
        hr = clamp(hr + 4 * mult * hours * decay, 100, 135);
        spo2 = clamp(spo2 - 0.8 * mult * hours * decay, 80, 92);
        stress = clamp(stress + 6 * mult * hours * decay, 50, 95);
        risk = clamp(current.cardiacRisk + 5 * mult * hours * decay, 80, 98);

        warnings.push("Ongoing myocardial infarction (STEMI) progression.");
        if (hours >= 6) {
          warnings.push("Myocardial necrosis expanding. High risk of cardiogenic shock.");
        }
        if (hours >= 12) {
          warnings.push("Impending congestive heart failure due to substantial tissue death.");
        }
      }
    }
  }

  else if (condition === "Bradycardia") {
    if (scenario === "drug_admin") {
      hr = clamp(30 - (30 - hr) * Math.exp(-hours * 0.5), 25, 36);
      spo2 = clamp(spo2 - 1.5 * hours * decay, 88, 93);
      stress = clamp(stress + 15 * hours * decay, 40, 80);
      risk = clamp(risk + 10 * hours * decay, 60, 88);
      warnings.push("CRITICAL: Drug-induced bradycardia (beta-blocker overdose/contraindication).");
      warnings.push("Severe bradyarrhythmia. High risk of sinus arrest or syncope.");
    } else if (scenario === "exercise") {
      hr = clamp(hr + 2 * hours * decay, 35, 52);
      spo2 = clamp(spo2 - 2.0 * hours * decay, 88, 93);
      stress = clamp(stress + 18 * hours * decay, 45, 80);
      risk = clamp(risk + 8 * hours * decay, 45, 75);
      warnings.push("Chronotropic incompetence under load.");
      warnings.push("Heart rate failing to meet metabolic demand. Risk of exercise-induced syncope.");
    } else {
      const mult = scenario === "low_oxygen" ? 1.2 : 1.0;
      hr = clamp(hr + (scenario === "fever" ? 3 : 0) * hours * decay, 35, 55);
      spo2 = clamp(spo2 - (scenario === "low_oxygen" ? 2.5 : 0.3) * hours * decay, 90, 97);
      risk = clamp(risk + 2 * mult * hours * decay, 25, 45);
      warnings.push("Sinus bradycardia. Monitor for dizziness or fatigue.");
    }
  }

  else if (condition === "Tachycardia") {
    if (scenario === "drug_admin") {
      hr = clamp(72 - (72 - hr) * Math.exp(-hours * 0.6), 65, 85);
      spo2 = clamp(spo2 + 0.5 * hours * decay, 96, 99);
      stress = clamp(stress - 15 * hours * decay, 10, 30);
      risk = clamp(10 + (risk - 10) * Math.exp(-hours * 0.6), 5, 20);
      warnings.push("Tachycardia successfully resolved via beta-blocker rate control.");
    } else if (scenario === "exercise") {
      hr = clamp(170 + (hr - 170) * Math.exp(-hours * 2), 130, 185);
      stress = clamp(stress + 20 * hours * decay, 50, 90);
      risk = clamp(risk + 8 * hours * decay, 45, 80);
      warnings.push("Severe sinus tachycardia under physical load. Extreme myocardial stress.");
    } else {
      const mult = scenario === "fever" ? 1.4 : scenario === "dehydration" ? 1.2 : 1.0;
      hr = clamp(hr + 3 * mult * hours * decay, 120, 150);
      risk = clamp(risk + 3 * mult * hours * decay, 30, 60);
      warnings.push("Sinus tachycardia. High resting cardiac output.");
    }
  }

  else if (condition === "Long QT Syndrome") {
    if (scenario === "exercise") {
      hr = clamp(135 + (hr - 135) * Math.exp(-hours * 2), 80, 145);
      risk = clamp(risk + 12 * hours * decay, 70, 95);
      warnings.push("Adrenergic trigger active. Danger of long-QT induced ventricular arrhythmia.");
      warnings.push("HIGH RISK: Exercise-induced Torsades de Pointes. Sudden cardiac arrest risk.");
    } else if (scenario === "fever" || scenario === "dehydration") {
      temp = clamp(39.0 - (39.0 - temp) * Math.exp(-hours * 0.5), 37.0, 39.5);
      risk = clamp(risk + 8 * hours * decay, 50, 85);
      warnings.push("Elevated core temperature and potential hypokalemia triggers prolonged QT.");
      warnings.push("High risk of ventricular tachycardia (Torsades de Pointes).");
    } else if (scenario === "drug_admin") {
      hr = clamp(62 - (62 - hr) * Math.exp(-hours * 0.5), 55, 70);
      risk = clamp(12 + (risk - 12) * Math.exp(-hours * 0.5), 8, 20);
      warnings.push("Adrenergic blockade achieved. Therapeutic prevention against Torsades.");
    } else {
      hr = hr + rand(-1, 1) * hours * 0.1;
      risk = clamp(risk + 0.5 * hours * decay, 25, 45);
      warnings.push("Long QT Syndrome. Avoid QTc-prolonging medications and strenuous exercise.");
    }
  }

  return {
    heartRate: parseFloat(hr.toFixed(1)),
    spo2: parseFloat(spo2.toFixed(1)),
    temperature: parseFloat(temp.toFixed(2)),
    stressIndex: Math.round(stress),
    cardiacRisk: Math.round(risk),
    warnings
  };
}

// ── Exported pure functions ────────────────────────────────────────────────────

export function computeScores(
  hr: number,
  spo2: number,
  temp: number,
  cardiacRiskBase: number
): {
  stressIndex: number;
  cardiacRisk: number;
  respiratoryHealth: number;
  recoveryScore: number;
  healthScore: number;
} {
  const stressIndex = clamp(
    (hr > 100 ? (hr - 100) * 1.5 : 0) +
    (spo2 < 95 ? (95 - spo2) * 4 : 0) +
    (temp > 37.5 ? (temp - 37.5) * 10 : 0),
    0, 100
  );

  const cardiacRisk = clamp(
    cardiacRiskBase +
    (hr > 100 ? 15 : hr < 50 ? 20 : 0) +
    (spo2 < 90 ? 30 : spo2 < 95 ? 15 : 0) +
    (temp > 39 ? 15 : temp > 38 ? 5 : 0) +
    stressIndex * 0.2,
    0, 100
  );

  const respiratoryHealth = clamp(
    spo2 - 80 +
    (temp < 37.5 ? 10 : -5) +
    (hr < 90 ? 8 : 0),
    0, 100
  );

  const recoveryScore = clamp(
    (spo2 > 97 ? 30 : spo2 > 95 ? 20 : 10) +
    (hr >= 60 && hr <= 80 ? 30 : 15) +
    (temp >= 36 && temp <= 37.5 ? 30 : 10) +
    (stressIndex < 20 ? 10 : 0),
    0, 100
  );

  // Penalty-based health score
  const hrPenalty = hr > 100 ? (hr - 100) * 0.3 : hr < 50 ? (50 - hr) * 0.5 : 0;
  const spo2Penalty = spo2 < 95 ? (95 - spo2) * 3 : 0;
  const tempPenalty = temp > 38 ? (temp - 38) * 5 : temp < 36 ? (36 - temp) * 5 : 0;
  const riskPenalty = cardiacRisk * 0.1;
  const healthScore = clamp(100 - hrPenalty - spo2Penalty - tempPenalty - riskPenalty, 0, 100);

  return { stressIndex, cardiacRisk, respiratoryHealth, recoveryScore, healthScore };
}

export function classifyCondition(hr: number, spo2: number, temp: number): Record<string, number> {
  const scores: Record<string, number> = {
    Normal: 10,
    "Atrial Fibrillation": 0,
    STEMI: 0,
    Bradycardia: 0,
    Tachycardia: 0,
    "Long QT Syndrome": 0,
  };

  if (hr === 0) {
    scores["Normal"] = 1;
    return scores;
  }

  // AF: very high HR with "irregular" feel (we proxy via HR > 120)
  if (hr > 120) {
    scores["Atrial Fibrillation"] += 60 + (hr - 120) * 0.4;
    scores["Tachycardia"] += 20;
  } else if (hr > 100) {
    scores["Tachycardia"] += 50 + (hr - 100) * 0.5;
    scores["Normal"] -= 5;
  } else if (hr < 55) {
    scores["Bradycardia"] += 60 + (55 - hr) * 0.8;
    scores["Long QT Syndrome"] += 10;
    scores["Normal"] -= 5;
  } else if (hr < 60) {
    scores["Bradycardia"] += 30;
    scores["Normal"] += 5;
  } else {
    // Normal HR range
    scores["Normal"] += 40;
  }

  // STEMI: low SpO2
  if (spo2 < 92) {
    scores["STEMI"] += 50 + (92 - spo2) * 2;
    scores["Normal"] -= 10;
  } else if (spo2 < 95) {
    scores["STEMI"] += 20;
  }

  // Temperature modifiers
  if (temp > 38.5) {
    scores["Normal"] -= 10;
  }

  // Clamp negatives to 0
  for (const key in scores) {
    if (scores[key] < 0) scores[key] = 0;
  }

  // Normalize to sum = 1
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    scores["Normal"] = 1;
    return scores;
  }
  const result: Record<string, number> = {};
  for (const key in scores) {
    result[key] = parseFloat((scores[key] / total).toFixed(4));
  }
  // Fix rounding drift
  const resultTotal = Object.values(result).reduce((a, b) => a + b, 0);
  const diff = parseFloat((1 - resultTotal).toFixed(4));
  const topKey = Object.keys(result).reduce((a, b) => (result[a] > result[b] ? a : b));
  result[topKey] = parseFloat((result[topKey] + diff).toFixed(4));

  return result;
}

// ── Default twin state ─────────────────────────────────────────────────────────

function defaultTwinState(): TwinState {
  const hr = 72, spo2 = 98, temp = 36.5;
  const scores = computeScores(hr, spo2, temp, 5);
  return {
    patientId: "default-patient",
    age: 35,
    gender: "Unknown",
    weight: 70,
    condition: "Normal",
    arrhythmia: false,
    heartRate: hr,
    spo2,
    temperature: temp,
    humidity: 40,
    pressure: 1013.25,
    ...scores,
    conditionProbabilities: classifyCondition(hr, spo2, temp),
    sensorMode: "SIMULATION_MODE",
    spectralStatus: "disabled",
    spectralChannels: [],
    ir: 0,
    red: 0,
  };
}

// ── Main hook ──────────────────────────────────────────────────────────────────

export function useTwinState(wsUrl: string) {
  const [twinState, setTwinState] = useState<TwinState>(defaultTwinState);
  const [sensorMode, setSensorMode] = useState<SensorMode>("SIMULATION_MODE");
  const [connected, setConnected] = useState(false);
  const [packets, setPackets] = useState<unknown[]>([]);
  const [scenario, setScenario] = useState<Scenario>("none");
  const [timeline, setTimeline] = useState<Timeline>("1h");
  const [isPersonaApplied, setIsPersonaApplied] = useState(false);
  const { addSample: addHRSample } = useHeartRateCalc();
  const { addSample: addSpO2Sample } = useSpO2Calc();

  const { sensorData } = useSensor();

  // Reference wrapper for WebSocket callbacks to avoid stale closures
  const isPersonaAppliedRef = useRef(false);
  isPersonaAppliedRef.current = isPersonaApplied;

  const isNormalPersonaAppliedRef = useRef(false);

  const twinStateRef = useRef(twinState);
  twinStateRef.current = twinState;

  useEffect(() => {
    if (isPersonaAppliedRef.current) return;
    setTwinState((prev) => {
      const hr = prev.heartRate;
      const spo2 = prev.spo2;
      const temp = prev.temperature;
      const cv = CONDITION_VITALS[prev.condition];

      const scores = computeScores(hr, spo2, temp, cv.cardiacRiskBase);
      scores.stressIndex = sensorData.stress;
      scores.cardiacRisk = clamp(
        cv.cardiacRiskBase +
        (hr > 100 ? 15 : hr < 50 ? 20 : 0) +
        (spo2 < 90 ? 30 : spo2 < 95 ? 15 : 0) +
        (temp > 39 ? 15 : temp > 38 ? 5 : 0) +
        sensorData.stress * 0.2,
        0, 100
      );

      return {
        ...prev,
        ...scores,
        conditionProbabilities: classifyCondition(hr, spo2, temp),
      };
    });
  }, [sensorData.stress]);

  // Keep sensorMode in a ref so the WS handler always sees the current value
  const sensorModeRef = useRef<SensorMode>("SIMULATION_MODE");
  sensorModeRef.current = sensorMode;

  // ── WebSocket ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial REST fetch
    fetch("http://localhost:8000/api/v1/sensor-data")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch initial sensor data");
      })
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "heart_rate" in (data as object)
        ) {
          if (!isPersonaAppliedRef.current) {
            applySensorData(data as RawSensorData);
          }
        }
      })
      .catch((err: unknown) => console.error(err));

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const packet = JSON.parse(event.data as string) as {
          type: string;
          data?: RawSensorData;
        };
        if (packet.type === "SIGNAL_DATA") {
          setPackets((prev) => [...prev, packet].slice(-10));
        } else if (packet.type === "SENSOR_DATA" && packet.data) {
          if (sensorModeRef.current === "REAL_SENSOR_MODE" || isNormalPersonaAppliedRef.current) {
            applySensorData(packet.data);
          }
        }
      } catch (err) {
        console.error("Error parsing WebSocket packet:", err);
      }
    };

    ws.onclose = () => setConnected(false);

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  // ── applyPersona ───────────────────────────────────────────────────────────

  const applyPersona = useCallback((persona: PersonaPayload) => {
    const rawCondition = persona.conditions[0] ?? "Normal";
    const knownConditions: Condition[] = [
      "Normal", "Atrial Fibrillation", "STEMI",
      "Bradycardia", "Tachycardia", "Long QT Syndrome",
    ];
    const condition: Condition = knownConditions.includes(rawCondition as Condition)
      ? (rawCondition as Condition)
      : "Normal";

    const cv = CONDITION_VITALS[condition];

    const hr = persona.hr_bpm;
    const spo2 = persona.signal_params?.spo2?.baseline_pct
      ?? (cv.spo2Min + rand(0, cv.spo2Max - cv.spo2Min));

    const isNormal = rawCondition === "Normal";
    const temp = isNormal ? (sensorData.temperature ?? 36.5) : rand(cv.tempMin, cv.tempMax);
    const humidity = isNormal ? (sensorData.humidity ?? 40) : 40;
    const pressure = isNormal ? (sensorData.pressure ?? 1013.25) : 1013.25;

    const scores = computeScores(hr, spo2, temp, cv.cardiacRiskBase);

    if (isNormal) {
      isNormalPersonaAppliedRef.current = true;
    } else {
      isNormalPersonaAppliedRef.current = false;
    }

    setTwinState({
      patientId: persona.persona_id,
      age: persona.age,
      gender: persona.sex,
      weight: persona.weight_kg ?? 70,
      condition,
      arrhythmia: persona.arrhythmia_type !== null,
      heartRate: hr,
      spo2,
      temperature: temp,
      humidity,
      pressure,
      ...scores,
      conditionProbabilities: classifyCondition(hr, spo2, temp),
      sensorMode: sensorModeRef.current,
      spectralStatus: "disabled",
      spectralChannels: [],
      ir: 0,
      red: 0,
    });

    setIsPersonaApplied(true);
  }, [sensorData.temperature, sensorData.humidity, sensorData.pressure]);

  // ── applySensorData ────────────────────────────────────────────────────────

  const applySensorData = useCallback((data: RawSensorData) => {
    setTwinState((prev) => {
      const rawIR = data.ir ?? 0;
      const rawRed = data.red ?? 0;
      // Do not touch heart rate and SpO2 (keep their previous values)
      const hr = prev.heartRate;
      const spo2 = prev.spo2;
      const temp = data.temperature ?? prev.temperature;
      const stress = typeof data.stress === "number" ? data.stress : prev.stressIndex;

      // Dynamically classify the condition from live vitals
      const probs = classifyCondition(hr, spo2, temp);
      const topConditionKey = Object.keys(probs).reduce((a, b) => (probs[a] > probs[b] ? a : b));
      const knownConditions: Condition[] = [
        "Normal", "Atrial Fibrillation", "STEMI",
        "Bradycardia", "Tachycardia", "Long QT Syndrome",
      ];
      const liveCondition: Condition = knownConditions.includes(topConditionKey as Condition)
        ? (topConditionKey as Condition)
        : "Normal";

      const cardiacRiskBase = CONDITION_VITALS[liveCondition].cardiacRiskBase;
      const scores = computeScores(hr, spo2, temp, cardiacRiskBase);
      scores.stressIndex = stress;
      scores.cardiacRisk = clamp(
        cardiacRiskBase +
        (hr > 100 ? 15 : hr < 50 ? 20 : 0) +
        (spo2 < 90 ? 30 : spo2 < 95 ? 15 : 0) +
        (temp > 39 ? 15 : temp > 38 ? 5 : 0) +
        stress * 0.2,
        0, 100
      );

      return {
        ...prev,
        heartRate: hr,
        spo2,
        temperature: temp,
        humidity: data.humidity ?? prev.humidity,
        pressure: data.pressure ?? prev.pressure,
        spectralStatus: data.spectral_status ?? prev.spectralStatus,
        spectralChannels: data.spectral_channels ?? prev.spectralChannels,
        condition: liveCondition,
        arrhythmia: CONDITION_VITALS[liveCondition].arrhythmia,
        ...scores,
        conditionProbabilities: probs,
        sensorMode: sensorModeRef.current,
        ir: rawIR,
        red: rawRed,
      };
    });
  }, []);

  // ── removePersona ──────────────────────────────────────────────────────────

  const removePersona = useCallback(() => {
    setIsPersonaApplied(false);
    isNormalPersonaAppliedRef.current = false;
    fetch("http://localhost:8000/api/v1/sensor-data")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch initial sensor data");
      })
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "heart_rate" in (data as object)
        ) {
          applySensorData(data as RawSensorData);
        }
      })
      .catch((err: unknown) => console.error(err));
  }, [applySensorData]);

  // ── setSensorMode (also keep in state for twinState field) ────────────────

  const handleSetSensorMode = useCallback((mode: SensorMode) => {
    setSensorMode(mode);
    setTwinState((prev) => ({ ...prev, sensorMode: mode }));
  }, []);

  // ── Prediction engine ──────────────────────────────────────────────────────

  const prediction = useMemo((): PredictionResult => {
    const hours = TIMELINE_HOURS[timeline];
    const fx = SCENARIO_EFFECTS[scenario];
    const cv = CONDITION_VITALS[twinState.condition];

    // Use the clinically-accurate condition-specific prediction engine
    const physPred = predictPhysiology(
      twinState.condition,
      {
        heartRate: twinState.heartRate,
        spo2: twinState.spo2,
        temperature: twinState.temperature,
        stressIndex: twinState.stressIndex,
        cardiacRisk: twinState.cardiacRisk,
      },
      scenario,
      hours
    );

    const predScores = computeScores(
      physPred.heartRate,
      physPred.spo2,
      physPred.temperature,
      cv.cardiacRiskBase
    );

    // Recover respiratory and recovery score from scenario effects (as modifier on predicted scores)
    const decay = hours > 24 ? 0.4 : hours > 1 ? 0.75 : 1.0;
    const respHealth = clamp(
      twinState.respiratoryHealth + fx.resp_health_rate * hours * decay,
      0, 100
    );
    const recoveryScore = clamp(
      twinState.recoveryScore + fx.recovery_rate * hours * decay,
      0, 100
    );

    const predicted: TwinState = {
      ...twinState,
      heartRate: physPred.heartRate,
      spo2: physPred.spo2,
      temperature: physPred.temperature,
      stressIndex: physPred.stressIndex,
      cardiacRisk: physPred.cardiacRisk,
      respiratoryHealth: respHealth,
      recoveryScore,
      healthScore: predScores.healthScore,
      conditionProbabilities: classifyCondition(
        physPred.heartRate,
        physPred.spo2,
        physPred.temperature
      ),
    };

    const risk_delta = predicted.cardiacRisk - twinState.cardiacRisk;
    // Confidence: condition-specific base + scenario base, penalized by longer timelines
    const conditionConfBase: Record<Condition, number> = {
      Normal: 96,
      "Atrial Fibrillation": 89,
      STEMI: 91,
      Bradycardia: 88,
      Tachycardia: 87,
      "Long QT Syndrome": 85,
    };
    const baseConf = Math.min(conditionConfBase[twinState.condition], fx.confidence);
    const timelinePenalty = hours >= 24 ? 12 : hours >= 12 ? 8 : hours >= 6 ? 4 : 0;
    const confidence = clamp(baseConf - timelinePenalty, 50, 99);

    return { predicted, risk_delta, confidence, warnings: physPred.warnings };
  }, [scenario, timeline, twinState]);

  return {
    twinState,
    connected,
    packets,
    applyPersona,
    removePersona,
    isPersonaApplied,
    applySensorData,
    setSensorMode: handleSetSensorMode,
    sensorMode,
    scenario,
    setScenario,
    timeline,
    setTimeline,
    prediction,
  };
}
