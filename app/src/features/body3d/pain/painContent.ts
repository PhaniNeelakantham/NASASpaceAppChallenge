import { DAY_MS } from '../../../state/crewStore'

export type RegionId = 'head' | 'neck' | 'chest' | 'upperBack' | 'abdomen' | 'lowerBack' | 'arm' | 'leg'
export type Side = 'left' | 'right'

export const PAIN_KINDS = ['Sharp', 'Dull / aching', 'Burning', 'Throbbing', 'Tingling / numb', 'Cramping'] as const
export type PainKind = (typeof PAIN_KINDS)[number]

export interface PainReport {
  id: string
  /** Reports at the same spot share a spot id, so we can show how it changes over time. */
  spot: string
  region: RegionId
  side?: Side
  pos: [number, number, number]
  severity: number
  kind: PainKind
  note: string
  at: number
}

export interface PainStore {
  reports: PainReport[]
  resolved: string[]
}

export interface RegionInfo {
  label: string
  /** Why this is common in space. */
  inSpace: string
  selfCare: string[]
  /** Red flags: go straight to the Crew Medical Officer / flight surgeon. */
  redFlags: string
}

// Draft guidance summarised from NASA HRP evidence reports and ISS crew medical experience.
// Content owner: verify before the demo.
export const REGIONS: Record<RegionId, RegionInfo> = {
  head: {
    label: 'Head',
    inSpace: 'Headaches are common in the first days of flight (fluid shifts to the head) and when cabin CO₂ is high.',
    selfCare: ['Drink water', 'Check the cabin CO₂ reading', 'Rest in a quiet, dim area', 'Pain reliever from the med kit if needed'],
    redFlags: 'Sudden “worst ever” headache, vision changes, confusion, or headache with fever and stiff neck.',
  },
  neck: {
    label: 'Neck',
    inSpace: 'Floating in a curled posture and sleeping in a bag can strain neck muscles.',
    selfCare: ['Gentle neck stretches', 'Warm pack', 'Check your sleep-station head strap'],
    redFlags: 'Neck stiffness with fever or headache, or numbness spreading down an arm.',
  },
  chest: {
    label: 'Chest',
    inSpace: 'Most chest pain in flight is muscle strain from exercise or translation, but heart problems must be ruled out first.',
    selfCare: ['Stop exercising and rest', 'Note if it changes when you press on it or move', 'Do a check-in (heart rate, BP, SpO₂)'],
    redFlags: 'Pressure or squeezing, pain spreading to arm, jaw or back, shortness of breath, sweating. Use EMERGENCY now.',
  },
  upperBack: {
    label: 'Upper back',
    inSpace: 'Workout strain and long hours at a workstation without a chair to support posture.',
    selfCare: ['Gentle stretching', 'Warm pack', 'Adjust foot restraints at your workstation'],
    redFlags: 'Sudden tearing pain, or pain with shortness of breath.',
  },
  abdomen: {
    label: 'Abdomen',
    inSpace: 'Constipation and gas are common with fluid shifts and a space diet. Bone calcium loss also raises kidney-stone risk.',
    selfCare: ['Drink more water', 'Fibre-rich food', 'Light movement'],
    redFlags: 'Pain in the side spreading to the groin, or blood in urine (kidney stone). Lower-right pain that keeps getting worse, especially with fever.',
  },
  lowerBack: {
    label: 'Lower back',
    inSpace: 'Over half of astronauts get lower back pain in the first weeks: without gravity the spine lengthens by up to ~5 cm.',
    selfCare: ['Pull knees to chest (fetal tuck) for a few minutes', 'Gentle stretches', 'Warm pack', 'Keep up resistance exercise'],
    redFlags: 'Numbness or weakness in the legs, or loss of bladder or bowel control.',
  },
  arm: {
    label: 'Arm & shoulder',
    inSpace: 'Spacesuit pressure points on shoulders and hands during EVAs, and strain from resistance exercise.',
    selfCare: ['Rest that arm from heavy exercise', 'Cold pack for 15 min if swollen', 'Check suit fit before the next EVA'],
    redFlags: 'Swelling with warmth and redness (possible blood clot), or numbness that does not go away.',
  },
  leg: {
    label: 'Leg & knee',
    inSpace: 'Treadmill and squat loading on muscles that weaken without gravity.',
    selfCare: ['Stretch and foam-roll', 'Lower the exercise load for a day', 'Drink water'],
    redFlags: 'One calf swollen, warm and red (possible blood clot): stop exercise and report immediately.',
  },
}

export function regionLabel(region: RegionId, side?: Side): string {
  const base = REGIONS[region].label
  return side ? `${side === 'left' ? 'Left' : 'Right'} ${base.toLowerCase()}` : base
}

export function severityColor(s: number): string {
  return s >= 7 ? '#ff5a4e' : s >= 4 ? '#fbbf24' : '#2dd4bf'
}

/** Severity 8+, or chest pain 6+, needs a human doctor in the loop now. */
export function needsEscalation(r: Pick<PainReport, 'region' | 'severity'>): boolean {
  return r.severity >= 8 || (r.region === 'chest' && r.severity >= 6)
}

// Simple invisible shapes approximating the body, used only to work out where a tap landed.
// +x is the astronaut's left. Units: metres, figure ≈ 1.85 m tall.
type V3 = [number, number, number]
export type Proxy =
  | { kind: 'sphere'; region: RegionId; side?: Side; center: V3; scale: V3 }
  | { kind: 'capsule'; region: RegionId; side?: Side; a: V3; b: V3; r: number }

export const PROXIES: Proxy[] = [
  { kind: 'sphere', region: 'head', center: [0, 1.7, 0.0], scale: [0.095, 0.12, 0.11] },
  { kind: 'capsule', region: 'neck', a: [0, 1.52, 0], b: [0, 1.6, 0], r: 0.055 },
  { kind: 'sphere', region: 'chest', center: [0, 1.3, 0.01], scale: [0.17, 0.2, 0.12] },
  { kind: 'sphere', region: 'abdomen', center: [0, 1.02, 0.01], scale: [0.15, 0.15, 0.115] },
  { kind: 'capsule', region: 'arm', side: 'left', a: [0.2, 1.45, 0], b: [0.29, 1.13, 0], r: 0.05 },
  { kind: 'capsule', region: 'arm', side: 'left', a: [0.29, 1.13, 0], b: [0.35, 0.82, 0.03], r: 0.042 },
  { kind: 'capsule', region: 'arm', side: 'right', a: [-0.2, 1.45, 0], b: [-0.29, 1.13, 0], r: 0.05 },
  { kind: 'capsule', region: 'arm', side: 'right', a: [-0.29, 1.13, 0], b: [-0.35, 0.82, 0.03], r: 0.042 },
  { kind: 'capsule', region: 'leg', side: 'left', a: [0.09, 0.9, 0], b: [0.11, 0.5, 0], r: 0.075 },
  { kind: 'capsule', region: 'leg', side: 'left', a: [0.11, 0.5, 0], b: [0.12, 0.08, 0], r: 0.055 },
  { kind: 'capsule', region: 'leg', side: 'right', a: [-0.09, 0.9, 0], b: [-0.11, 0.5, 0], r: 0.075 },
  { kind: 'capsule', region: 'leg', side: 'right', a: [-0.11, 0.5, 0], b: [-0.12, 0.08, 0], r: 0.055 },
]

/** Front/back split for the trunk: a tap on the back of the chest is the upper back, etc. */
export function refineRegion(region: RegionId, z: number): RegionId {
  if (region === 'chest' && z < -0.02) return 'upperBack'
  if (region === 'abdomen' && z < -0.02) return 'lowerBack'
  return region
}

/** Simulated history: K. Tanaka has lower back pain that is easing (the classic early-flight complaint). */
export function seedPain(crewId: string): PainStore {
  if (crewId !== 'c3') return { reports: [], resolved: [] }
  const now = Date.now()
  const base = { spot: 'seed-lb', region: 'lowerBack' as const, pos: [0.03, 1.0, -0.105] as V3, kind: 'Dull / aching' as const }
  return {
    reports: [
      { ...base, id: 's1', severity: 6, note: 'Woke up stiff', at: now - 3 * DAY_MS },
      { ...base, id: 's2', severity: 5, note: '', at: now - 2 * DAY_MS },
      { ...base, id: 's3', severity: 3, note: 'Fetal tuck helps', at: now - 1 * DAY_MS },
    ],
    resolved: [],
  }
}
