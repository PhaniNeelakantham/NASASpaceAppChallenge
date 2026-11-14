import type { EnvironmentId } from '../state/mission'
import type { SystemId } from '../types'

/**
 * Emergency decision trees for non-doctors.
 *
 * Content follows standard lay first-aid logic (check safety → response → breathing → CPR/position →
 * monitor → escalate), adapted for microgravity. It never gives drug doses: it points to the
 * vehicle's medical kit checklist. PROTOTYPE decision support — must be reviewed by flight surgeons.
 */

export interface Ctx {
  env: EnvironmentId
  /** No usable gravity (station, spacecraft). */
  zeroG: boolean
  patient: string
}

type Txt = string | ((c: Ctx) => string)

export type Tool = 'cpr' | 'vitals' | 'timer'

export type EmergencyNode =
  | { kind: 'ask'; id: string; text: Txt; detail?: Txt; yes: string; no: string; yesLabel?: string; noLabel?: string }
  | { kind: 'do'; id: string; text: Txt; detail?: Txt; next: string; tool?: Tool; timerSec?: number; doneLabel?: string }
  | { kind: 'end'; id: string; text: Txt; detail?: Txt }

export interface Protocol {
  id: string
  title: string
  /** Short tile label. */
  tile: string
  icon: string
  /** Body system the emergency belongs to (used for the consult message). */
  system: SystemId
  start: string
  urgent: boolean
}

export function txt(t: Txt | undefined, c: Ctx): string {
  if (t === undefined) return ''
  return typeof t === 'function' ? t(c) : t
}

export const PROTOCOLS: Protocol[] = [
  { id: 'collapse', title: 'Collapsed / not responding', tile: 'Collapsed or not responding', icon: '⬇', system: 'heart', start: 'safe', urgent: true },
  { id: 'chest', title: 'Chest pain', tile: 'Chest pain', icon: '♥', system: 'heart', start: 'c_awake', urgent: true },
  { id: 'breath', title: 'Trouble breathing / low oxygen', tile: 'Can’t breathe / low oxygen', icon: '≋', system: 'lungs', start: 'b_awake', urgent: true },
  { id: 'bleed', title: 'Heavy bleeding / injury', tile: 'Heavy bleeding or injury', icon: '✚', system: 'skin', start: 'x_gloves', urgent: false },
  { id: 'toxic', title: 'Smoke or toxic leak', tile: 'Smoke or toxic leak', icon: '☁', system: 'lungs', start: 't_mask', urgent: false },
  { id: 'dcs', title: 'Pain or numbness after a spacewalk', tile: 'Joint pain / numbness after EVA', icon: '◎', system: 'muscle', start: 'd_after', urgent: false },
]

const N: EmergencyNode[] = [
  /* ---------------- Collapsed / not responding ---------------- */
  {
    kind: 'do',
    id: 'safe',
    text: 'Check it is safe for you. Any fire, smoke or pressure alarm?',
    detail: 'If an alarm is sounding, put on your mask and follow that alarm’s checklist first. You can’t help if you’re hurt.',
    next: 'respond',
    doneLabel: 'It’s safe',
  },
  {
    kind: 'ask',
    id: 'respond',
    text: (c) => `Tap ${c.patient}’s shoulders and shout their name. Do they respond?`,
    yes: 'r_awake',
    no: 'help',
  },
  {
    kind: 'do',
    id: 'help',
    text: (c) =>
      c.env === 'rover'
        ? 'Radio the base now. Then grab the first-aid kit within reach.'
        : 'Shout for the crew. Send one person for the medical kit and the defibrillator (AED).',
    detail: 'If you are alone, keep going — HALO is logging everything for the team.',
    next: 'breathing',
  },
  {
    kind: 'ask',
    id: 'breathing',
    text: 'Tilt the head back and lift the chin. Look, listen and feel for 10 seconds. Breathing normally?',
    detail: 'Occasional gasps are NOT normal breathing — answer No.',
    yes: 'recovery',
    no: 'cpr_setup',
  },
  {
    kind: 'do',
    id: 'cpr_setup',
    text: (c) =>
      c.zeroG
        ? 'Strap them flat to the medical restraint or a wall, chest facing you. Brace your feet under a handrail.'
        : 'Lay them on their back on a firm floor. Kneel next to their chest.',
    detail: (c) =>
      c.zeroG
        ? 'In 0 g every push moves you away. Lock yourself in place first — or wrap your legs around their torso.'
        : 'Low gravity means you weigh less — use your arms and shoulders, not just body weight.',
    next: 'cpr',
  },
  {
    kind: 'do',
    id: 'cpr',
    text: 'Push hard and fast in the centre of the chest. 30 pushes, then 2 breaths. Follow the beat.',
    detail: '5–6 cm deep, 100–120 per minute, let the chest come back up. Swap rescuers every 2 minutes.',
    tool: 'cpr',
    next: 'aed',
    doneLabel: 'AED is here',
  },
  {
    kind: 'do',
    id: 'aed',
    text: 'Switch on the AED and follow its voice. Keep pushing until it says “stand clear”.',
    detail: (c) => (c.zeroG ? 'Keep them strapped down and make sure nobody touches them during the shock.' : 'Nobody touches them during the shock.'),
    next: 'aed_check',
  },
  {
    kind: 'ask',
    id: 'aed_check',
    text: 'Are they breathing normally now?',
    yes: 'recovery',
    no: 'cpr',
    noLabel: 'No — continue CPR',
  },
  {
    kind: 'do',
    id: 'recovery',
    text: (c) =>
      c.zeroG
        ? 'Keep them restrained on their side so the airway stays clear.'
        : 'Roll them onto their side (recovery position) so the airway stays clear.',
    detail: (c) => (c.zeroG ? 'Vomit does not fall away in 0 g. Have suction or a bag ready.' : 'Keep their head tilted back slightly.'),
    tool: 'timer',
    timerSec: 60,
    next: 'vitals',
  },
  {
    kind: 'do',
    id: 'vitals',
    text: 'Measure pulse, blood pressure and blood oxygen. Enter them below.',
    detail: 'Pulse: two fingers beside the windpipe for 30 s × 2. Oxygen: clip on a warm finger.',
    tool: 'vitals',
    next: 'end_monitor',
  },
  {
    kind: 'end',
    id: 'end_monitor',
    text: 'Stay with them. Re-check breathing and vitals every 5 minutes.',
    detail: 'Hand this log to your Crew Medical Officer. If they stop breathing normally, start again from the top.',
  },
  {
    kind: 'do',
    id: 'r_awake',
    text: 'Keep them still and supported. Ask what happened and where it hurts.',
    next: 'r_chest',
  },
  {
    kind: 'ask',
    id: 'r_chest',
    text: 'Do they have chest pain or pressure?',
    yes: 'c_rest',
    no: 'vitals',
  },

  /* ---------------- Chest pain ---------------- */
  {
    kind: 'ask',
    id: 'c_awake',
    text: (c) => `Is ${c.patient} awake and breathing normally?`,
    yes: 'c_rest',
    no: 'help',
    noLabel: 'No — start resuscitation',
  },
  {
    kind: 'do',
    id: 'c_rest',
    text: (c) => (c.zeroG ? 'Stop all activity. Strap them loosely so they can rest without drifting.' : 'Stop all activity. Help them rest half-sitting, supported.'),
    detail: 'Effort makes the heart work harder. Stay calm and talk to them.',
    next: 'c_monitor',
  },
  {
    kind: 'do',
    id: 'c_monitor',
    text: 'Attach the heart monitor (or Bio-Monitor shirt). Measure pulse, blood pressure and oxygen.',
    tool: 'vitals',
    next: 'c_o2',
  },
  {
    kind: 'ask',
    id: 'c_o2',
    text: 'Is blood oxygen below 94%?',
    yes: 'c_give_o2',
    no: 'c_kit',
  },
  {
    kind: 'do',
    id: 'c_give_o2',
    text: 'Give oxygen by mask, following the medical kit checklist.',
    next: 'c_kit',
  },
  {
    kind: 'do',
    id: 'c_kit',
    text: 'Open the chest-pain card in the medical kit and follow it. Check allergies first.',
    detail: 'The card covers medicines such as aspirin. HALO does not give doses — the kit card does.',
    next: 'c_watch',
  },
  {
    kind: 'do',
    id: 'c_watch',
    text: 'Stay with them. Re-check pulse, blood pressure and oxygen every 5 minutes.',
    detail: 'Note when the pain started and if it spreads to the arm, jaw or back.',
    tool: 'timer',
    timerSec: 300,
    next: 'c_worse',
  },
  {
    kind: 'ask',
    id: 'c_worse',
    text: 'Did they become unresponsive or stop breathing normally?',
    yes: 'help',
    no: 'c_end',
    yesLabel: 'Yes — start resuscitation',
  },
  {
    kind: 'end',
    id: 'c_end',
    text: 'Keep monitoring every 5 minutes.',
    detail: 'Pain lasting over 15 minutes, or getting worse, needs your Crew Medical Officer now and a consult with the flight surgeon.',
  },

  /* ---------------- Breathing / low oxygen ---------------- */
  {
    kind: 'ask',
    id: 'b_awake',
    text: (c) => `Is ${c.patient} awake?`,
    yes: 'b_cabin',
    no: 'help',
  },
  {
    kind: 'do',
    id: 'b_cabin',
    text: 'Check the cabin: CO₂ or pressure alarm? Smoke or a chemical smell?',
    detail: 'If yes: everyone puts on an emergency mask, then follow that alarm’s checklist.',
    next: 'b_measure',
  },
  {
    kind: 'do',
    id: 'b_measure',
    text: 'Measure blood oxygen. Count breaths for 30 seconds and double it.',
    tool: 'vitals',
    next: 'b_low',
  },
  {
    kind: 'ask',
    id: 'b_low',
    text: 'Is oxygen below 92%, or are their lips blue?',
    yes: 'b_o2',
    no: 'b_watch',
  },
  {
    kind: 'do',
    id: 'b_o2',
    text: 'Give oxygen by mask now, following the medical kit checklist.',
    detail: (c) => (c.zeroG ? 'Keep them upright relative to you and calm — slow breaths.' : 'Help them sit upright — it makes breathing easier.'),
    next: 'b_watch',
  },
  {
    kind: 'do',
    id: 'b_watch',
    text: 'Keep them calm and still. Re-check oxygen every 5 minutes.',
    tool: 'timer',
    timerSec: 300,
    next: 'b_worse',
  },
  {
    kind: 'ask',
    id: 'b_worse',
    text: 'Getting worse, or did they stop responding?',
    yes: 'help',
    no: 'b_end',
  },
  { kind: 'end', id: 'b_end', text: 'Log the readings and report to your Crew Medical Officer.', detail: 'If it returns, restart this guide.' },

  /* ---------------- Bleeding / injury ---------------- */
  {
    kind: 'do',
    id: 'x_gloves',
    text: 'Put on gloves from the medical kit.',
    detail: (c) => (c.zeroG ? 'In 0 g blood forms floating droplets. Keep the wound covered so droplets don’t spread.' : ''),
    next: 'x_press',
  },
  {
    kind: 'do',
    id: 'x_press',
    text: 'Press firmly on the wound with gauze. Don’t lift it to check — keep pressing.',
    detail: 'Hold steady pressure for 10 minutes.',
    tool: 'timer',
    timerSec: 600,
    next: 'x_still',
  },
  {
    kind: 'ask',
    id: 'x_still',
    text: 'Is it still bleeding heavily through the gauze?',
    yes: 'x_more',
    no: 'x_bandage',
  },
  {
    kind: 'do',
    id: 'x_more',
    text: 'Add more gauze on top and keep pressing. For an arm or leg, use the kit’s tourniquet above the wound.',
    detail: 'Write down the time the tourniquet went on.',
    next: 'x_still',
  },
  {
    kind: 'do',
    id: 'x_bandage',
    text: 'Bandage the wound firmly. Check they are awake and breathing.',
    next: 'vitals',
  },

  /* ---------------- Smoke / toxic leak ---------------- */
  {
    kind: 'do',
    id: 't_mask',
    text: 'Put on your emergency mask first. Then help others with theirs.',
    next: 't_isolate',
  },
  {
    kind: 'do',
    id: 't_isolate',
    text: 'Follow the alarm checklist: move the crew to a safe module and close the hatch.',
    next: 't_any',
  },
  {
    kind: 'ask',
    id: 't_any',
    text: 'Is anyone not responding?',
    yes: 'help',
    no: 't_rinse',
  },
  {
    kind: 'do',
    id: 't_rinse',
    text: 'For eye or skin contact: rinse with plenty of water for 15 minutes.',
    next: 'b_measure',
  },

  /* ---------------- Decompression sickness (after EVA) ---------------- */
  {
    kind: 'ask',
    id: 'd_after',
    text: 'Did the symptoms start within hours after a spacewalk or a pressure change?',
    yes: 'd_o2',
    no: 'd_not',
  },
  {
    kind: 'do',
    id: 'd_o2',
    text: 'Give 100% oxygen by mask now, following the kit checklist.',
    next: 'd_serious',
  },
  {
    kind: 'ask',
    id: 'd_serious',
    text: 'Any numbness, weakness, confusion, trouble breathing or chest pain?',
    yes: 'd_urgent',
    no: 'd_watch',
  },
  {
    kind: 'do',
    id: 'd_urgent',
    text: 'This may be serious decompression sickness. Get your Crew Medical Officer now.',
    detail: 'The vehicle’s treatment procedure may use repressurisation (for example, in the suit). Keep them on oxygen.',
    next: 'd_watch',
  },
  {
    kind: 'do',
    id: 'd_watch',
    text: 'Keep them resting on oxygen. Re-check symptoms every 10 minutes.',
    tool: 'timer',
    timerSec: 600,
    next: 'vitals',
  },
  {
    kind: 'end',
    id: 'd_not',
    text: 'This is probably not decompression sickness.',
    detail: 'Use the guided measurements to check them and report symptoms to your Crew Medical Officer.',
  },
]

export const NODES: Record<string, EmergencyNode> = Object.fromEntries(N.map((n) => [n.id, n]))
