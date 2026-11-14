import type { SystemId } from '../types'

export interface SystemInfo {
  id: SystemId
  label: string
  /** What the system does, in plain language. */
  role: string
  /** NASA HRP risk this maps to. */
  hrpRisk: string
  /** Why spaceflight affects it. */
  whyInSpace: string
  /** Default countermeasures / actions. */
  actions: string[]
  /** When to escalate beyond self-care. */
  escalateIf: string
  /** Indicators tracked outside the numeric metrics (shown as node satellites). */
  extraIndicators: string[]
  /** Imaging that applies to this system, if any. */
  imaging?: string
  source: { label: string; url: string }
}

const HRP = 'https://www.nasa.gov/hrp/risks/'

// Draft content summarised from NASA HRP "Risks of Human Spaceflight".
// Content owner: expand, verify, and add specific citations.
export const SYSTEMS: Record<SystemId, SystemInfo> = {
  skin: {
    id: 'skin',
    label: 'Skin & surface',
    role: 'Barrier against infection; shows rashes, bruising and pressure injuries.',
    hrpRisk: 'Risk of Altered Immune System Responses · Spacewalk injury',
    whyInSpace: 'Viral reactivation can cause rashes, and EVA suits create pressure points on shoulders, hands and feet.',
    actions: ['Photograph and log any rash', 'Check EVA pressure points after spacewalks', 'Keep skin clean and moisturised'],
    escalateIf: 'Spreading rash, blistering, or rash with fever → Crew Medical Officer.',
    extraIndicators: ['Rash check', 'EVA pressure points', 'Bruising'],
    source: { label: 'NASA HRP — Risks of Human Spaceflight', url: HRP },
  },
  heart: {
    id: 'heart',
    label: 'Heart & vessels',
    role: 'Pumps blood and keeps blood pressure stable when you change posture.',
    hrpRisk: 'Risk of Cardiovascular Adaptations',
    whyInSpace: 'Without gravity, body fluids shift toward the head and the heart works less. It can decondition, and blood pressure control weakens on return to gravity.',
    actions: ['Complete scheduled aerobic exercise', 'Keep fluid intake on plan', 'Re-measure BP after 5 minutes of rest'],
    escalateIf: 'Chest pain, fainting, or BP outside limits on two readings → Crew Medical Officer.',
    extraIndicators: ['ECG rhythm'],
    imaging: 'Cardiac ultrasound (echo)',
    source: { label: 'NASA HRP — Cardiovascular Adaptations', url: HRP },
  },
  lungs: {
    id: 'lungs',
    label: 'Lungs & oxygen',
    role: 'Moves oxygen into the blood and removes carbon dioxide.',
    hrpRisk: 'Risk of Hypoxia',
    whyInSpace: 'EVA pre-breathe protocols and low-pressure atmospheres can lower tissue oxygen. Elevated cabin CO₂ can cause headaches.',
    actions: ['Re-check SpO₂ at rest', 'Check cabin CO₂ reading', 'Avoid strenuous tasks until normal'],
    escalateIf: 'SpO₂ below 92% or shortness of breath at rest → Crew Medical Officer immediately.',
    extraIndicators: ['Breathing rate', 'Cabin CO₂'],
    imaging: 'Lung ultrasound',
    source: { label: 'NASA HRP — Hypoxia', url: HRP },
  },
  eyes: {
    id: 'eyes',
    label: 'Eyes & brain',
    role: 'Vision and the nervous system that controls the body.',
    hrpRisk: 'Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)',
    whyInSpace: 'The structure of the eyes and brain can change in spaceflight, likely linked to headward fluid shift.',
    actions: ['Run the near-vision grid test daily', 'Log any headaches', 'Note blurred vision episodes'],
    escalateIf: 'New blurred vision or grid distortions → Crew Medical Officer; include in ground digest.',
    extraIndicators: ['Vision grid test', 'Headache log'],
    imaging: 'Ocular ultrasound',
    source: { label: 'NASA HRP — SANS', url: HRP },
  },
  bones: {
    id: 'bones',
    label: 'Bones',
    role: 'Structure and protection; stores calcium.',
    hrpRisk: 'Risk of Spaceflight-Induced Bone Changes',
    whyInSpace: 'Without gravity loading, bones break down faster and become more brittle. In-flight density can’t be measured, so HALO tracks the risk factors.',
    actions: ['Hit resistance exercise target (ARED)', 'Meet calcium and vitamin D intake', 'Stay hydrated (kidney-stone risk)'],
    escalateIf: 'Flank pain or blood in urine → Crew Medical Officer.',
    extraIndicators: ['Calcium intake', 'Hydration'],
    source: { label: 'NASA HRP — Bone Changes', url: HRP },
  },
  muscle: {
    id: 'muscle',
    label: 'Muscles & fitness',
    role: 'Movement, strength and endurance.',
    hrpRisk: 'Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness',
    whyInSpace: 'Muscles that fight gravity on Earth weaken quickly when unused.',
    actions: ['Complete daily exercise block', 'Track body mass weekly', 'Prioritise protein intake'],
    escalateIf: 'Body mass drops >5% from baseline → Crew Medical Officer.',
    extraIndicators: ['Strength test'],
    imaging: 'Muscle ultrasound',
    source: { label: 'NASA HRP — Reduced Fitness', url: HRP },
  },
  immune: {
    id: 'immune',
    label: 'Immune system',
    role: 'Defends against infection.',
    hrpRisk: 'Risk of Altered Immune System Responses',
    whyInSpace: 'Spaceflight stress can reactivate dormant viruses, causing rashes and other symptoms.',
    actions: ['Re-measure temperature in 1 hour', 'Log symptoms (rash, cold sores)', 'Rest and hydrate'],
    escalateIf: 'Temperature ≥ 38.3 °C twice or worsening rash → Crew Medical Officer.',
    extraIndicators: ['Symptom log', 'Blood count (CBC)'],
    source: { label: 'NASA HRP — Immune System', url: HRP },
  },
  gut: {
    id: 'gut',
    label: 'Nutrition & metabolism',
    role: 'Turns food into energy; regulates blood sugar.',
    hrpRisk: 'Risk of Inadequate Food and Nutrition',
    whyInSpace: 'Appetite drops and diets are limited; metabolism and blood-sugar regulation can shift.',
    actions: ['Log meals', 'Re-test glucose 2 h after eating', 'Follow menu calorie targets'],
    escalateIf: 'Glucose below 70 or above 180 mg/dL with symptoms → Crew Medical Officer.',
    extraIndicators: ['Meal log'],
    imaging: 'Abdominal ultrasound',
    source: { label: 'NASA HRP — Food and Nutrition', url: HRP },
  },
  mind: {
    id: 'mind',
    label: 'Mind & mood',
    role: 'Emotional wellbeing, focus and teamwork.',
    hrpRisk: 'Risk of Behavioral Changes and Psychiatric Disorders',
    whyInSpace: 'Isolation, confinement, distance from Earth and workload all weigh on mental health.',
    actions: ['Schedule private family contact', 'Take a short break from screens', 'Talk with a crewmate you trust'],
    escalateIf: 'Low mood for 5+ days or thoughts of self-harm → Crew Medical Officer and ground psychologist.',
    extraIndicators: ['Private journal'],
    source: { label: 'NASA HRP — Behavioral Health', url: HRP },
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep & alertness',
    role: 'Recovery, memory and reaction speed.',
    hrpRisk: 'Risk of Inadequate Sleep and Irregular Schedules',
    whyInSpace: 'Noise, light cycles every ~90 minutes in orbit, and workload cause chronic sleep loss.',
    actions: ['Protect tonight’s sleep window', 'Avoid critical tasks if reaction test is poor', 'Dim screens 1 h before sleep'],
    escalateIf: 'Under 5 h sleep for 3+ nights with rising reaction-test lapses → reschedule critical tasks with CMO.',
    extraIndicators: ['Light exposure'],
    source: { label: 'NASA HRP — Sleep', url: HRP },
  },
}

export const SYSTEM_LIST = Object.values(SYSTEMS)
