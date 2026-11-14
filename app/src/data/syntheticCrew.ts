import type { CrewMember, Reading } from '../types'

// SIMULATED data for the prototype. Will be replaced by /public/data/synthetic_crew.json
// produced by the Python generator in /data. Deterministic so the demo is repeatable.

export const CREW: CrewMember[] = [
  { id: 'c1', name: 'A. Rivera', role: 'Commander' },
  { id: 'c2', name: 'M. Okafor', role: 'Crew Medical Officer' },
  { id: 'c3', name: 'K. Tanaka', role: 'Flight Engineer' },
  { id: 'c4', name: 'L. Novak', role: 'Mission Specialist' },
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9)
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

export const CURRENT_DAY = 142
const DAYS = 30

/**
 * Generates the last 30 mission days for a crew member.
 * Injected scenarios (for the demo story):
 *  - c1: sleep debt over the last 4 days with rising reaction-test lapses
 *  - c2: fever on the last 2 days (the CMO is the one who is sick)
 */
export function generateReadings(crewId: string): Reading[] {
  const r = rng(crewId.charCodeAt(1) * 7919)
  const base = {
    heartRate: 62 + r() * 8,
    systolic: 112 + r() * 10,
    diastolic: 72 + r() * 6,
    spo2: 97.5 + r(),
    temperature: 36.6 + r() * 0.3,
    glucose: 92 + r() * 10,
    sleepHours: 6.6 + r() * 0.8,
    mood: 7 + r(),
    stress: 3.5 + r(),
    pvtLapses: 2 + r(),
    exerciseMin: 120 + r() * 20,
    bodyMass: 68 + r() * 14,
  }
  const out: Reading[] = []
  for (let i = 0; i < DAYS; i++) {
    const day = CURRENT_DAY - DAYS + 1 + i
    const daysLeft = DAYS - 1 - i
    const v = {
      heartRate: round(base.heartRate + gauss(r) * 2.5, 0),
      systolic: round(base.systolic + gauss(r) * 4, 0),
      diastolic: round(base.diastolic + gauss(r) * 3, 0),
      spo2: round(Math.min(100, base.spo2 + gauss(r) * 0.5), 0),
      temperature: round(base.temperature + gauss(r) * 0.12),
      glucose: round(base.glucose + gauss(r) * 6, 0),
      sleepHours: round(base.sleepHours + gauss(r) * 0.35),
      mood: round(Math.min(10, base.mood + gauss(r) * 0.5), 0),
      stress: round(Math.max(1, base.stress + gauss(r) * 0.6), 0),
      pvtLapses: Math.max(0, round(base.pvtLapses + gauss(r) * 0.8, 0)),
      exerciseMin: round(base.exerciseMin + gauss(r) * 10, 0),
      bodyMass: round(base.bodyMass - i * 0.02 + gauss(r) * 0.2),
    }
    const symptoms: string[] = []
    if (crewId === 'c1' && daysLeft < 4) {
      v.sleepHours = round(5.2 - (3 - daysLeft) * 0.15)
      v.pvtLapses = 4 + (3 - daysLeft) * 1.5
      v.mood = 6
    }
    if (crewId === 'c2' && daysLeft < 2) {
      v.temperature = daysLeft === 0 ? 38.6 : 38.1
      v.heartRate = round(base.heartRate + 14, 0)
      symptoms.push('fatigue', daysLeft === 0 ? 'rash' : 'headache')
    }
    out.push({ crewId, missionDay: day, timestamp: `MD${day}`, values: v, symptoms, source: 'simulated' })
  }
  return out
}

export const READINGS: Record<string, Reading[]> = Object.fromEntries(
  CREW.map((c) => [c.id, generateReadings(c.id)]),
)
