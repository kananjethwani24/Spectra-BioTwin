"use client";
import { useRef, useCallback } from "react";

const BUFFER_SIZE = 100;       // ~20s at 5Hz (200ms intervals)
const MIN_PEAK_DISTANCE = 10;  // min 10 samples between peaks (~2s at 5Hz = 30bpm min)
const FINGER_THRESHOLD = 500;  // IR must be above this

function detectPeaks(signal: number[], minDist: number): number[] {
  if (signal.length < 3) return [];

  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const threshold = mean * 1.01; // peak must be 1% above mean (subtle waveform)

  const peaks: number[] = [];
  for (let i = 1; i < signal.length - 1; i++) {
    if (
      signal[i] > threshold &&
      signal[i] > signal[i - 1] &&
      signal[i] > signal[i + 1]
    ) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

export function useHeartRateCalc() {
  const irBuffer  = useRef<number[]>([]);
  const tsBuffer  = useRef<number[]>([]);

  const addSample = useCallback((ir: number, timestampMs: number): number => {
    if (ir < FINGER_THRESHOLD) {
      irBuffer.current = [];
      tsBuffer.current = [];
      return 0;
    }

    irBuffer.current.push(ir);
    tsBuffer.current.push(timestampMs);

    if (irBuffer.current.length > BUFFER_SIZE) {
      irBuffer.current.shift();
      tsBuffer.current.shift();
    }

    // Need at least 20 samples to calculate
    if (irBuffer.current.length < 20) return 0;

    const peaks = detectPeaks(irBuffer.current, MIN_PEAK_DISTANCE);
    if (peaks.length < 2) return 0;

    let totalMs = 0;
    for (let i = 1; i < peaks.length; i++) {
      totalMs += tsBuffer.current[peaks[i]] - tsBuffer.current[peaks[i - 1]];
    }
    const avgIntervalMs = totalMs / (peaks.length - 1);

    const bpm = Math.round(60000 / avgIntervalMs);
    if (bpm < 30 || bpm > 220) return 0;
    return bpm;
  }, []);

  const reset = useCallback(() => {
    irBuffer.current = [];
    tsBuffer.current = [];
  }, []);

  return { addSample, reset };
}
