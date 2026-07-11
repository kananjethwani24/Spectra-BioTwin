"use client";
import { useRef, useCallback } from "react";

const BUFFER_SIZE = 100;
const FINGER_THRESHOLD = 500;

/**
 * Computes AC (peak-to-peak) and DC (mean) components of a signal buffer.
 */
function acDc(buf: number[]): { ac: number; dc: number } {
  if (buf.length === 0) return { ac: 0, dc: 0 };
  const dc = buf.reduce((a, b) => a + b, 0) / buf.length;
  const max = Math.max(...buf);
  const min = Math.min(...buf);
  const ac = max - min;
  return { ac, dc };
}

/**
 * useSpO2Calc
 * Call addSample(ir, red) each time a new reading arrives.
 * Returns estimated SpO2 percentage (0 if no finger or insufficient data).
 *
 * Formula:  R = (AC_red / DC_red) / (AC_ir / DC_ir)
 *           SpO2 ≈ 110 - 25 * R
 */
export function useSpO2Calc() {
  const irBuf  = useRef<number[]>([]);
  const redBuf = useRef<number[]>([]);

  const addSample = useCallback((ir: number, red: number): number => {
    if (ir < FINGER_THRESHOLD) {
      irBuf.current  = [];
      redBuf.current = [];
      return 0;
    }

    irBuf.current.push(ir);
    redBuf.current.push(red);

    if (irBuf.current.length > BUFFER_SIZE) {
      irBuf.current.shift();
      redBuf.current.shift();
    }

    if (irBuf.current.length < 50) return 0;

    const irStats  = acDc(irBuf.current);
    const redStats = acDc(redBuf.current);

    if (irStats.dc === 0 || redStats.dc === 0 || irStats.ac === 0) return 0;

    const R = (redStats.ac / redStats.dc) / (irStats.ac / irStats.dc);
    const spo2 = 110 - 25 * R;

    return Math.min(100, Math.max(80, Math.round(spo2)));
  }, []);

  const reset = useCallback(() => {
    irBuf.current  = [];
    redBuf.current = [];
  }, []);

  return { addSample, reset };
}
