import type { DonkiEvent } from '../state/spaceWeather'

type Kind = DonkiEvent['type']

/** Plain-language meaning of each NASA DONKI event type, for crews (not space physicists). */
export const EVENT_INFO: Record<Kind, { label: string; short: string; meaning: string; color: string }> = {
  SEP: {
    label: 'Solar particle event',
    short: 'SEP',
    meaning: 'High-energy particles from the Sun. This is the direct radiation hazard for crews outside Earth’s magnetic field — shelter until it passes.',
    color: '#ff5a4e',
  },
  CME: {
    label: 'Coronal mass ejection',
    short: 'CME',
    meaning: 'A cloud of solar plasma. Fast ones (over ~1,000 km/s) can drive particle events and storms one to three days later.',
    color: '#7dd3fc',
  },
  GST: {
    label: 'Geomagnetic storm',
    short: 'Storm',
    meaning: 'Earth’s magnetic field is disturbed (Kp 5 = minor … 9 = extreme). Matters for the ISS, which then gets more radiation on high-latitude orbits.',
    color: '#fbbf24',
  },
  RBE: {
    label: 'Radiation belt enhancement',
    short: 'Belts',
    meaning: 'More trapped particles in Earth’s radiation belts. Matters for the ISS and any spacecraft passing through them.',
    color: '#c4b5fd',
  },
  FLR: {
    label: 'Solar flare',
    short: 'Flare',
    meaning: 'A burst of light and X-rays from the Sun; strong (X-class) flares can be followed by particle events.',
    color: '#fde68a',
  },
}

/** NOAA G-scale name for a Kp value. */
export function stormScale(kp: number | null | undefined): string {
  if (!kp) return ''
  if (kp >= 9) return 'G5 extreme'
  if (kp >= 8) return 'G4 severe'
  if (kp >= 7) return 'G3 strong'
  if (kp >= 6) return 'G2 moderate'
  if (kp >= 5) return 'G1 minor'
  return 'below storm level'
}
