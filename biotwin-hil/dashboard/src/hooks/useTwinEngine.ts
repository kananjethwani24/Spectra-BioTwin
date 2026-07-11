"use client";
// Backward-compatibility shim. Real engine lives in useTwinState.
import { useState, useMemo } from "react";
import { computeScores, classifyCondition } from "./useTwinState";

export type { TwinState, Scenario, Timeline, PredictionResult } from "./useTwinState";
export { computeScores } from "./useTwinState";

import type { TwinState, Scenario, Timeline, PredictionResult } from "./useTwinState";

type EffectVector = {
  hr_rate: number; spo2_rate: number; temp_rate: number;
  stress_rate: number; cardiac_risk_rate: number; resp_health_rate: number;
  recovery_rate: number; confidence: number; warnings: string[];
};

const SCENARIO_EFFECTS: Record<Scenario, EffectVector> = {
  none:        { hr_rate: 0,   spo2_rate: 0,  temp_rate: 0,    stress_rate: -1,  cardiac_risk_rate: -0.5, resp_health_rate: 0.2,  recovery_rate: 1,   confidence: 95, warnings: [] },
  exercise:    { hr_rate: 30,  spo2_rate: -1, temp_rate: 1.5,  stress_rate: 10,  cardiac_risk_rate: 5,    resp_health_rate: -3,   recovery_rate: -5,  confidence: 88, warnings: ["Elevated cardiac load detected", "Monitor SpO\u2082 during peak exertion"] },
  fever:       { hr_rate: 10,  spo2_rate: -2, temp_rate: 2.0,  stress_rate: 15,  cardiac_risk_rate: 8,    resp_health_rate: -5,   recovery_rate: -8,  confidence: 82, warnings: ["Hyperthermia risk above 39.5\u00b0C", "Dehydration cascade likely"] },
  low_oxygen:  { hr_rate: 15,  spo2_rate: -8, temp_rate: 0.2,  stress_rate: 20,  cardiac_risk_rate: 12,   resp_health_rate: -10,  recovery_rate: -10, confidence: 79, warnings: ["Critical SpO\u2082 drop predicted", "Hypoxia risk \u2014 recommend O\u2082 supplementation"] },
  drug_admin:  { hr_rate: -12, spo2_rate: 1,  temp_rate: -0.5, stress_rate: -20, cardiac_risk_rate: -10,  resp_health_rate: 5,    recovery_rate: 8,   confidence: 85, warnings: ["Bradycardia risk if HR < 50 bpm", "Monitor blood pressure response"] },
  dehydration: { hr_rate: 18,  spo2_rate: -1, temp_rate: 0.8,  stress_rate: 12,  cardiac_risk_rate: 9,    resp_health_rate: -4,   recovery_rate: -12, confidence: 81, warnings: ["Plasma volume reduction expected", "Electrolyte imbalance risk"] },
};

const TIMELINE_HOURS: Record<Timeline, number> = {
  "1h": 1,
  "6h": 6,
  "12h": 12,
  "24h": 24,
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function deriveTwinState(sensor: {
  heart_rate: number; spo2: number; temperature: number;
  humidity?: number; pressure?: number; health_score?: number;
}): TwinState {
  const hr = sensor.heart_rate, spo2 = sensor.spo2, temp = sensor.temperature;
  const scores = computeScores(hr, spo2, temp, 5);
  return {
    patientId: "legacy", age: 0, gender: "Unknown", weight: 70,
    condition: "Normal", arrhythmia: false,
    heartRate: hr, spo2, temperature: temp,
    humidity: sensor.humidity ?? 40, pressure: sensor.pressure ?? 1013.25,
    ...scores,
    conditionProbabilities: classifyCondition(hr, spo2, temp),
    sensorMode: "SIMULATION_MODE", spectralStatus: "disabled", spectralChannels: [],
    ir: 0, red: 0,
  };
}

export function useTwinEngine(sensorData: {
  heart_rate: number; spo2: number; temperature: number; health_score?: number;
}) {
  const [scenario, setScenario] = useState<Scenario>("none");
  const [timeline, setTimeline] = useState<Timeline>("1h");
  const currentState = useMemo(() => deriveTwinState(sensorData), [sensorData]);

  const prediction = useMemo((): PredictionResult => {
    const fx = SCENARIO_EFFECTS[scenario];
    const hours = TIMELINE_HOURS[timeline];
    const decay = hours > 24 ? 0.4 : hours > 1 ? 0.75 : 1.0;
    const predHR   = clamp(currentState.heartRate   + fx.hr_rate          * hours * decay, 30, 220);
    const predSpo2 = clamp(currentState.spo2        + fx.spo2_rate        * hours * decay, 70, 100);
    const predTemp = clamp(currentState.temperature + fx.temp_rate        * hours * decay, 34, 42);
    const predScores = computeScores(predHR, predSpo2, predTemp, 5);
    const predicted: TwinState = {
      ...currentState,
      heartRate: predHR, spo2: predSpo2, temperature: predTemp,
      stressIndex:       clamp(currentState.stressIndex       + fx.stress_rate       * hours * decay, 0, 100),
      cardiacRisk:       clamp(currentState.cardiacRisk       + fx.cardiac_risk_rate * hours * decay, 0, 100),
      respiratoryHealth: clamp(currentState.respiratoryHealth + fx.resp_health_rate  * hours * decay, 0, 100),
      recoveryScore:     clamp(currentState.recoveryScore     + fx.recovery_rate     * hours * decay, 0, 100),
      healthScore: predScores.healthScore,
      conditionProbabilities: classifyCondition(predHR, predSpo2, predTemp),
    };
    const risk_delta = predicted.cardiacRisk - currentState.cardiacRisk;
    const confidence = clamp(fx.confidence - (hours > 24 ? 15 : hours > 1 ? 5 : 0), 50, 99);
    return { predicted, risk_delta, confidence, warnings: fx.warnings };
  }, [scenario, timeline, currentState]);

  return { currentState, scenario, setScenario, timeline, setTimeline, prediction };
}
