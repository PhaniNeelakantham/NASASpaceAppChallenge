import type { MetricDef, MetricId } from '../types'

// DRAFT thresholds for the prototype. Science/content owner must confirm each one
// and add a citation in systems.ts before the demo.
export const METRICS: Record<MetricId, MetricDef> = {
  heartRate: { id: 'heartRate', label: 'Resting heart rate', unit: 'bpm', system: 'heart', warnLow: 40, warnHigh: 120, zCaution: 2, zWarning: 3, badDirection: 'both' },
  systolic: { id: 'systolic', label: 'Systolic BP', unit: 'mmHg', system: 'heart', warnLow: 85, warnHigh: 160, zCaution: 2, zWarning: 3, badDirection: 'both' },
  diastolic: { id: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', system: 'heart', warnLow: 50, warnHigh: 100, zCaution: 2, zWarning: 3, badDirection: 'both' },
  spo2: { id: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', system: 'lungs', warnLow: 92, zCaution: 2, zWarning: 3, badDirection: 'low' },
  temperature: { id: 'temperature', label: 'Body temperature', unit: '°C', system: 'immune', warnHigh: 38.3, warnLow: 35.5, zCaution: 2, zWarning: 3, badDirection: 'both' },
  glucose: { id: 'glucose', label: 'Blood glucose', unit: 'mg/dL', system: 'gut', warnLow: 70, warnHigh: 180, zCaution: 2, zWarning: 3, badDirection: 'both' },
  sleepHours: { id: 'sleepHours', label: 'Sleep', unit: 'h', system: 'sleep', warnLow: 4.5, zCaution: 1.5, zWarning: 2.5, badDirection: 'low' },
  mood: { id: 'mood', label: 'Mood (1–10)', unit: '', system: 'mind', warnLow: 3, zCaution: 1.5, zWarning: 2.5, badDirection: 'low' },
  stress: { id: 'stress', label: 'Stress (1–10)', unit: '', system: 'mind', warnHigh: 9, zCaution: 1.5, zWarning: 2.5, badDirection: 'high' },
  pvtLapses: { id: 'pvtLapses', label: 'Reaction test lapses', unit: '', system: 'sleep', warnHigh: 10, zCaution: 2, zWarning: 3, badDirection: 'high' },
  exerciseMin: { id: 'exerciseMin', label: 'Exercise', unit: 'min', system: 'bones', zCaution: 1.5, zWarning: 2.5, badDirection: 'low' },
  bodyMass: { id: 'bodyMass', label: 'Body mass', unit: 'kg', system: 'muscle', zCaution: 2, zWarning: 3, badDirection: 'low' },
}

export const METRIC_LIST = Object.values(METRICS)
