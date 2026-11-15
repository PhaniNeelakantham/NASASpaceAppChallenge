export type Status = 'nominal' | 'caution' | 'warning' | 'nodata'

export type SystemId =
  | 'skin'
  | 'heart'
  | 'lungs'
  | 'eyes'
  | 'bones'
  | 'muscle'
  | 'immune'
  | 'gut'
  | 'mind'
  | 'sleep'

export type MetricId =
  | 'heartRate'
  | 'systolic'
  | 'diastolic'
  | 'spo2'
  | 'temperature'
  | 'glucose'
  | 'sleepHours'
  | 'mood'
  | 'stress'
  | 'pvtLapses'
  | 'exerciseMin'
  | 'bodyMass'

/** One daily check-in. Missing values are allowed (astronauts skip steps). */
export interface Reading {
  crewId: string
  missionDay: number
  timestamp: string
  values: Partial<Record<MetricId, number>>
  symptoms: string[]
  source: 'simulated' | 'manual' | 'camera'
}

export interface MetricDef {
  id: MetricId
  label: string
  unit: string
  system: SystemId
  /** Absolute safety limits (warning). Values are draft, confirm with D before demo. */
  warnLow?: number
  warnHigh?: number
  /** Personal-baseline deviation (z-score) that triggers caution. */
  zCaution: number
  zWarning: number
  /** Which direction is bad; 'both' if either. */
  badDirection: 'high' | 'low' | 'both'
}

export interface Finding {
  metric: MetricId
  system: SystemId
  status: Exclude<Status, 'nodata'>
  value: number
  baselineMean: number
  z: number
  /** Consecutive days outside baseline in the bad direction. */
  streak: number
  reason: string
}

export interface CrewMember {
  id: string
  name: string
  role: string
}
