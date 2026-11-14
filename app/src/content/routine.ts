import type { CareTool } from '../features/care/CareScreen'
import type { SystemId } from '../types'

/** The five hazards of human spaceflight (NASA Human Research Program). */
export type Hazard = 'Radiation' | 'Isolation' | 'Distance' | 'Gravity' | 'Closed environment'

export type TaskAction =
  /** Opens the Check-in tab; marked done when the check-in is finished. */
  | 'checkin'
  /** Counts glasses of water toward a daily goal. */
  | 'water'
  /** Runs the built-in reaction test. */
  | 'pvt'
  /** Astronaut ticks it off. */
  | 'mark'

export interface RoutineTask {
  id: string
  label: string
  /** One line: what to do. */
  howTo: string
  /** One line: why it matters in space. */
  why: string
  /** Local clock window [start hour, end hour). Weekly tasks have none. */
  window?: [number, number]
  cadence: 'daily' | 'weekly' | 'mission'
  xp: number
  action: TaskAction
  /** Body system this protects; if that system is flagged, the task is marked Priority. */
  system: SystemId
  hazard: Hazard
  /** Care tool that does this task (opens from the Today list). */
  open?: CareTool
}

export const WATER_GOAL = 10 // glasses of 250 mL = 2.5 L
export const WATER_ML = 250

// Daily schedule modelled on ISS crew routines (≈2 h exercise a day, morning medical
// checks, fixed sleep window). Times are local clock hours.
export const DAILY_TASKS: RoutineTask[] = [
  {
    id: 'checkin',
    label: 'Morning check-in',
    howTo: 'Heart rate, blood pressure, SpO₂, temperature, sleep and mood (about 3 min).',
    why: 'Far from Earth you are your own first doctor: a daily baseline makes changes visible early.',
    window: [7, 10],
    cadence: 'daily',
    xp: 30,
    action: 'checkin',
    system: 'heart',
    hazard: 'Distance',
  },
  {
    id: 'hydration',
    label: 'Drink 2.5 L of water',
    howTo: `Log each ${WATER_ML} mL glass. Goal: ${WATER_GOAL} glasses before evening.`,
    why: 'Fluid shifts toward the head, and bone calcium loss raises kidney-stone risk. Water helps with both.',
    window: [8, 20],
    cadence: 'daily',
    xp: 15,
    action: 'water',
    system: 'gut',
    hazard: 'Gravity',
  },
  {
    id: 'exercise-res',
    label: 'Resistance exercise · 60 min',
    howTo: 'Squats, deadlifts and heel raises on the resistance device.',
    why: 'Without loading, weight-bearing bones can lose about 1–1.5 % of their density a month.',
    window: [9, 13],
    cadence: 'daily',
    xp: 25,
    action: 'mark',
    system: 'bones',
    hazard: 'Gravity',
  },
  {
    id: 'pvt',
    label: 'Reaction test · 1 min',
    howTo: 'Tap as fast as you can when the target appears. Five rounds.',
    why: 'Slow reactions are an early sign of fatigue and sleep loss, before you notice them yourself.',
    window: [12, 15],
    cadence: 'daily',
    xp: 15,
    action: 'pvt',
    system: 'sleep',
    hazard: 'Isolation',
  },
  {
    id: 'exercise-cardio',
    label: 'Cardio · 45 min',
    howTo: 'Treadmill (with harness) or cycle at a steady, conversational pace.',
    why: 'Keeps heart and blood vessels conditioned so you don’t get dizzy back in gravity.',
    window: [14, 18],
    cadence: 'daily',
    xp: 25,
    action: 'mark',
    system: 'heart',
    hazard: 'Gravity',
  },
  {
    id: 'connect',
    label: 'Talk to someone · 10 min',
    howTo: 'A meal with the crew, a call home, or a private journal entry.',
    why: 'Isolation and confinement wear down mood and team cohesion over long missions.',
    window: [17, 21],
    cadence: 'daily',
    xp: 15,
    action: 'mark',
    system: 'mind',
    hazard: 'Isolation',
    open: 'journal',
  },
  {
    id: 'wind-down',
    label: 'Wind-down for sleep',
    howTo: 'Dim lights to the evening setting, screens off, sleep bag by 22:30.',
    why: 'Without sunrise and sunset your body clock drifts. A fixed routine protects sleep.',
    window: [21, 23],
    cadence: 'daily',
    xp: 15,
    action: 'mark',
    system: 'sleep',
    hazard: 'Closed environment',
  },
]

export const WEEKLY_TASKS: RoutineTask[] = [
  {
    id: 'vision',
    label: 'Vision check · Amsler grid',
    howTo: 'Cover one eye, look at the centre dot, tap any wavy or missing squares. Repeat for the other eye.',
    why: 'Fluid shift can swell the optic nerve (SANS) and change eyesight without pain.',
    cadence: 'weekly',
    xp: 40,
    action: 'mark',
    system: 'eyes',
    hazard: 'Gravity',
    open: 'vision',
  },
  {
    id: 'mass',
    label: 'Body mass measurement',
    howTo: 'Use the body-mass device (it measures mass by spring oscillation, no scale needed).',
    why: 'Unplanned weight loss is a sign of under-eating and muscle loss.',
    cadence: 'weekly',
    xp: 40,
    action: 'mark',
    system: 'muscle',
    hazard: 'Gravity',
  },
]

WEEKLY_TASKS.push({
  id: 'buddy',
  label: 'Crew buddy check',
  howTo: 'Rate how one crewmate has seemed this week: energy, mood, focus, getting along.',
  why: 'Crewmates often spot tiredness or withdrawal before the person notices it in themselves.',
  cadence: 'weekly',
  xp: 30,
  action: 'mark',
  system: 'mind',
  hazard: 'Isolation',
  open: 'buddy',
})

export const ALL_TASKS = [...DAILY_TASKS, ...WEEKLY_TASKS]

export interface Badge {
  id: string
  label: string
  glyph: string
  how: string
}

export const BADGES: Badge[] = [
  { id: 'first-light', label: 'First Light', glyph: '✦', how: 'Complete a check-in' },
  { id: 'week', label: 'Full Orbit', glyph: '◐', how: '7-day check-in streak' },
  { id: 'month', label: 'Long Haul', glyph: '◉', how: '30-day check-in streak' },
  { id: 'iron', label: 'Iron Bones', glyph: '▣', how: 'Both workouts 7 days in a row' },
  { id: 'hydro', label: 'Hydro Hero', glyph: '◆', how: 'Water goal 5 days in a row' },
  { id: 'sharp', label: 'Sharp Shooter', glyph: '⌖', how: 'Reaction test with zero lapses' },
  { id: 'sleep', label: 'Night Watch', glyph: '☾', how: 'Wind-down 5 days in a row' },
  { id: 'sweep', label: 'Clean Sweep', glyph: '★', how: 'Every daily task in one day' },
]

export const RANKS = ['Cadet', 'Specialist', 'Flight Engineer', 'Mission Specialist', 'Pilot', 'Commander', 'Station Legend']
export const XP_PER_LEVEL = 600

export function levelFor(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  return {
    level,
    rank: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))],
    into: xp % XP_PER_LEVEL,
    next: XP_PER_LEVEL,
  }
}
