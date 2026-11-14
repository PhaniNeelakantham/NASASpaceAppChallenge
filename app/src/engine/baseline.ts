import type { MetricId, Reading } from '../types'

export interface Baseline {
  mean: number
  sd: number
  n: number
}

/**
 * Personal baseline from the first `windowDays` readings (pre-flight / early-mission normal).
 * Floors the SD so a very stable person doesn't trigger alerts on tiny changes.
 */
export function computeBaseline(readings: Reading[], metric: MetricId, windowDays = 7): Baseline | null {
  const vals = readings
    .slice(0, windowDays)
    .map((r) => r.values[metric])
    .filter((v): v is number => typeof v === 'number')
  if (vals.length < 3) return null
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1)
  const sd = Math.max(Math.sqrt(variance), Math.abs(mean) * 0.02, 0.1)
  return { mean, sd, n: vals.length }
}

export function zScore(value: number, b: Baseline): number {
  return (value - b.mean) / b.sd
}
