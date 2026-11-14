import type { Status } from '../../types'

/** Status palette. Healthy = calm teal; amber = monitor; coral = action required. */
export const STATUS_HEX: Record<Status, string> = {
  nominal: '#2dd4bf',
  caution: '#fbbf24',
  warning: '#ff5a4e',
  nodata: '#64748b',
}

/** Calm, low-contrast baseline anatomy colors. */
export const ANATOMY = {
  skin: '#4aa3d6',
  muscle: '#2a9fb5',
  bone: '#b4cde6',
  artery: '#4f8dff',
  vein: '#7c6dff',
  heart: '#5aa8ff',
  organ: '#6cc8ff',
  brain: '#a5b4fc',
  nerve: '#c4b5fd',
  lymph: '#5eead4',
}

/** Anatomy keeps its calm color unless its system needs attention. */
export function tint(status: Status, base: string): string {
  return status === 'caution' || status === 'warning' ? STATUS_HEX[status] : base
}

export type LayerId = 'skin' | 'musculo' | 'cardio' | 'organs'

export const LAYERS: { id: LayerId; label: string; sub: string; color: string }[] = [
  { id: 'skin', label: 'Skin / Surface', sub: 'Rashes · bruising · EVA pressure points', color: ANATOMY.skin },
  { id: 'musculo', label: 'Musculoskeletal', sub: 'Bones · muscles', color: ANATOMY.bone },
  { id: 'cardio', label: 'Cardiovascular / Fluids', sub: 'Heart · vessels · lymph', color: ANATOMY.artery },
  { id: 'organs', label: 'Organs & Nervous', sub: 'Brain · lungs · gut · nerves', color: ANATOMY.brain },
]

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
