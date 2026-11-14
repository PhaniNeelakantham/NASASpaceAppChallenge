import type { SystemId } from '../types'

// The five settings the challenge brief names: spacecraft, space station, rover, base on a moon / another planet.
export type EnvironmentId = 'iss' | 'transit' | 'lunarBase' | 'rover' | 'marsBase'

export type EscalationMode =
  /** Flight surgeon on Earth is reachable in (near) real time. */
  | 'live'
  /** First contact is a nearby crew medical officer over local radio. */
  | 'radio'
  /** Earth is minutes away: messages are queued and replies arrive after the round trip. */
  | 'queued'

export interface MissionEnvironment {
  id: EnvironmentId
  /** What kind of place this is, in the brief's words. */
  kind: string
  label: string
  location: string
  gravity: string
  /** One-way signal delay to Earth, seconds (representative value). */
  oneWayDelaySec: number
  groundAvailable: 'instant' | 'delayed'
  note: string
  evacuation: string
  /** Approximate daily radiation dose, mSv/day. */
  doseMsvPerDay: number
  doseNote: string
  daylight: string
  /** Medical capability on board / on site. */
  medical: string[]
  exercise: string
  /** Body systems that matter most here (shown as priority nodes). */
  priorities: SystemId[]
  /** Environment-specific insight per body system. */
  insights: Partial<Record<SystemId, string>>
  /** Routine prompts specific to this environment. */
  checklist: string[]
  escalation: {
    mode: EscalationMode
    /** Who you contact first. */
    firstContact: string
    /** Extra option, e.g. driving back to base. */
    fallback?: string
  }
}

// Dose rates are representative published measurements (see DESIGN.md sources):
// ISS ~0.3–0.8 mSv/day; deep-space cruise ~1.8 mSv/day (Curiosity RAD, 2013);
// Mars surface ~0.64 mSv/day (Curiosity RAD, 2014); lunar surface ~1.4 mSv/day (Chang'e-4 LND, 2020).
export const ENVIRONMENTS: Record<EnvironmentId, MissionEnvironment> = {
  iss: {
    id: 'iss',
    kind: 'Space station',
    label: 'ISS · Low Earth orbit',
    location: 'International Space Station, 400 km above Earth',
    gravity: '0 g',
    oneWayDelaySec: 0,
    groundAvailable: 'instant',
    note: 'Flight surgeon reachable in real time.',
    evacuation: 'Hours — docked crew vehicle can return',
    doseMsvPerDay: 0.5,
    doseNote: 'Partly shielded by Earth’s magnetic field',
    daylight: '16 sunrises a day — follow the station light schedule',
    medical: ['Full medical kit', 'Ultrasound with live expert guidance', 'Defibrillator', '24/7 ground telemedicine'],
    exercise: 'ARED resistance, treadmill, cycle ergometer',
    priorities: ['bones', 'eyes', 'sleep'],
    insights: {
      bones: '0 g unloads your skeleton all day. ARED resistance sessions are your main countermeasure — don’t skip them.',
      eyes: 'Fluids shift toward your head constantly in 0 g. SANS risk grows with mission length — keep the weekly vision test.',
      sleep: '16 sunrises a day confuse your body clock. Use the station’s light schedule and eye mask.',
      heart: 'Your heart works less in 0 g and deconditions without daily aerobic exercise.',
      muscle: 'Postural muscles weaken fastest. The treadmill harness and ARED keep them loaded.',
      lungs: 'Cabin CO₂ runs higher than on Earth — headaches and poor focus can follow.',
      immune: 'Stress and a shared closed cabin raise viral reactivation risk.',
      mind: 'Private family calls and psychological support are available daily.',
      skin: 'Dry station air — moisturise and check for rashes.',
      gut: 'Fresh food is rare; follow the menu to keep calories and vitamin D up.',
    },
    checklist: ['Morning check-in', 'ARED session (bone loading)', 'Weekly vision grid test'],
    escalation: { mode: 'live', firstContact: 'Flight surgeon, Mission Control (live call)' },
  },
  transit: {
    id: 'transit',
    kind: 'Spacecraft',
    label: 'Mars transit',
    location: 'Interplanetary cruise to Mars, month 5 of ~7',
    gravity: '0 g',
    oneWayDelaySec: 18 * 60 + 40,
    groundAvailable: 'delayed',
    note: 'No real-time help. Crew acts first, ground advises later.',
    evacuation: 'Not possible — the trajectory can’t turn back',
    doseMsvPerDay: 1.8,
    doseNote: 'Highest of any phase — no planet or magnetic field to shield you',
    daylight: 'No day or night — anchor sleep to a fixed schedule',
    medical: ['Limited medical kit', 'AI-guided ultrasound (no live expert)', 'Crew Medical Officer on board'],
    exercise: 'Compact flywheel resistance device only',
    priorities: ['mind', 'bones', 'immune'],
    insights: {
      mind: 'Longest isolation of the mission and Earth is a dot. Check mood daily — your crew is your only real-time support.',
      bones: 'Months in 0 g with only a compact exerciser. Bone loss builds up before you have to stand on Mars.',
      immune: 'Highest radiation plus chronic stress — immune changes and viral reactivation are more likely here.',
      heart: 'Deconditioning matters: you’ll need to stand and work in Mars gravity on arrival.',
      eyes: 'SANS risk rises with time in 0 g, and no eye specialist can examine you for months.',
      sleep: 'No natural light cues at all. Keep fixed sleep and wake times.',
      lungs: 'Closed-loop life support: watch cabin CO₂ trends and log headaches.',
      muscle: 'The compact device limits loading — prioritise resistance work.',
      gut: 'The food supply is fixed for the whole cruise and vitamins degrade over time. Log meals.',
      skin: 'Rashes can signal viral reactivation — photograph and log them.',
    },
    checklist: ['Morning check-in', 'Resistance session on the compact device', 'Mood check + private journal', 'Storm-shelter kit ready'],
    escalation: { mode: 'queued', firstContact: 'Crew Medical Officer (on board)' },
  },
  lunarBase: {
    id: 'lunarBase',
    kind: 'Base on a moon',
    label: 'Lunar base',
    location: 'Surface habitat near the lunar south pole',
    gravity: '0.17 g',
    oneWayDelaySec: 1.3,
    groundAvailable: 'instant',
    note: 'Near-real-time contact; evacuation takes days.',
    evacuation: '3–5 days back to Earth',
    doseMsvPerDay: 1.4,
    doseNote: 'Surface dose; less inside a shielded habitat',
    daylight: 'Long polar days and nights — use the habitat light schedule',
    medical: ['Medical bay kit', 'Ultrasound with live Earth guidance', 'Evacuation possible in days'],
    exercise: 'Treadmill in 1/6 g + resistance device',
    priorities: ['lungs', 'skin', 'bones'],
    insights: {
      lungs: 'Lunar dust is fine and sharp — Apollo crews reported “lunar hay fever”. Log congestion or cough after every EVA.',
      skin: 'EVA suits create pressure points and dust abrades skin. Check hands, shoulders and feet after each EVA.',
      eyes: 'Dust can scratch the eyes — rinse and log any irritation.',
      bones: '1/6 g loads your bones a little, but not enough. Keep the resistance sessions.',
      muscle: 'EVA work is heavy on shoulders and hands — watch for strain.',
      heart: 'Moving between suits and 1/6 g stresses circulation — check blood pressure after EVAs.',
      sleep: 'Days and nights last weeks at the pole. Keep the habitat light schedule.',
      immune: 'Dust exposure and EVA fatigue add stress on the immune system.',
      mind: 'Earth is close enough to call, which helps. Use it.',
      gut: 'Higher workload on EVA days — eat and drink more.',
    },
    checklist: ['Post-EVA skin & pressure-point check', 'Dust exposure log (nose, eyes)', 'Morning check-in'],
    escalation: { mode: 'live', firstContact: 'Flight surgeon on Earth (2.6 s round trip)' },
  },
  rover: {
    id: 'rover',
    kind: 'Rover',
    label: 'Pressurized lunar rover',
    location: 'Two-person rover, day 2 of a traverse, 40 km from base',
    gravity: '0.17 g',
    oneWayDelaySec: 1.3,
    groundAvailable: 'instant',
    note: 'Base medical officer is a radio call away; the drive back takes hours.',
    evacuation: 'Drive back to base — about 6 hours',
    doseMsvPerDay: 1.4,
    doseNote: 'Thinner shielding than the base — head back during solar storms',
    daylight: 'Shift driving and cramped bunks',
    medical: ['Small first-aid kit', 'No ultrasound', 'Base medical officer by radio'],
    exercise: 'None on board — isometric routine only',
    priorities: ['lungs', 'skin', 'sleep'],
    insights: {
      lungs: 'Small cabin: CO₂ builds up fast. Log headaches and check the scrubber reading every 2 hours.',
      skin: 'Frequent suit-port EVAs — check pressure points and hand abrasions after each one.',
      sleep: 'Cramped bunks and shift driving. Don’t drive after a poor reaction test.',
      muscle: 'Very little room to move. Do the isometric routine and watch for back pain.',
      heart: 'Long sitting plus suit time — watch for dizziness when you stand.',
      mind: 'Two people, far from base. Check in with each other twice a day.',
      bones: 'No exercise equipment for days — bone loading pauses until you’re back.',
      immune: 'Shared tiny cabin: an infection will spread to your partner. Report symptoms early.',
      eyes: 'Long driving shifts strain the eyes — log blurred vision.',
      gut: 'Packed meals only — keep drinking, dehydration creeps up in the suit.',
    },
    checklist: ['CO₂ scrubber reading (every 2 h)', 'Reaction test before each driving shift', 'Post-EVA pressure-point check'],
    escalation: { mode: 'radio', firstContact: 'Base Crew Medical Officer (radio)', fallback: 'Drive back to base (~6 h)' },
  },
  marsBase: {
    id: 'marsBase',
    kind: 'Base on another planet',
    label: 'Mars base',
    location: 'Surface habitat, sol 30 after landing',
    gravity: '0.38 g',
    oneWayDelaySec: 12 * 60,
    groundAvailable: 'delayed',
    note: 'Crew Medical Officer leads; ground reviews digests.',
    evacuation: 'Not possible — next return window is many months away',
    doseMsvPerDay: 0.64,
    doseNote: 'The planet blocks half the sky; the thin atmosphere helps a little',
    daylight: 'A sol is 24 h 39 min — schedules drift 39 min a day',
    medical: ['Medical bay kit', 'AI-guided ultrasound', 'Crew Medical Officer on site'],
    exercise: 'Treadmill + resistance device in 0.38 g',
    priorities: ['heart', 'muscle', 'lungs'],
    insights: {
      heart: 'After months in 0 g, standing in Mars gravity can make you dizzy. Compare blood pressure lying down vs standing.',
      muscle: 'Re-adapting to gravity: falls and strains are more likely in the first weeks.',
      lungs: 'Mars dust contains toxic perchlorates. Keep it out of the habitat and log any cough.',
      bones: '0.38 g helps but won’t reverse what you lost in transit. Keep loading.',
      sleep: 'Each sol is 39 minutes longer than an Earth day — anchor sleep to the habitat schedule.',
      mind: 'Earth replies take ~25 minutes. The crew decides first.',
      eyes: 'Eye changes from transit can persist — keep the weekly vision test.',
      immune: 'Closed habitat for years: report symptoms early to protect the crew.',
      skin: 'Dust and suit pressure points after EVAs — inspect skin.',
      gut: 'Greenhouse food may supplement stores — log what you eat.',
    },
    checklist: ['Orthostatic check: BP lying vs standing', 'Airlock dust hygiene log', 'Morning check-in'],
    escalation: { mode: 'queued', firstContact: 'Crew Medical Officer (on site)' },
  },
}

export const ENVIRONMENT_LIST = Object.values(ENVIRONMENTS)

export function formatDelay(sec: number): string {
  if (sec === 0) return 'live'
  if (sec < 60) return `${sec.toFixed(1)} s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

/** mm:ss countdown. */
export function formatCountdown(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
