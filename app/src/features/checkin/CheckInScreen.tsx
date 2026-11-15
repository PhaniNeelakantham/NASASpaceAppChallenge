import { inl, ToneIcon } from '../../components/ToneIcon'
import { Camera, CircleCheck, Mic } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AskHalo, type AppTab } from '../../components/AskHalo'
import { METRICS } from '../../content/metrics'
import { ENVIRONMENTS, type EnvironmentId } from '../../state/mission'
import { today, usePersistentState } from '../../state/persist'
import { useRoutine } from '../../state/routine'
import type { MetricId, SystemId } from '../../types'
import { CameraPulse } from './CameraPulse'
import { parseCommand, parseSpokenNumber, speak, useListener, voiceSupported } from './voice'

// Step-by-step daily check-in (≤ 3 min). TODO (B): persist to IndexedDB via Dexie,
// add "How do I measure this?" content, symptom chips.
const STEPS: { metric: MetricId; howTo: string; min: number; max: number; step: number; ask?: string }[] = [
  { metric: 'heartRate', howTo: 'Sit still (or anchor your feet) for 1 minute, then read the Bio-Monitor or count your pulse for 30 s × 2.', min: 30, max: 180, step: 1, ask: 'What is your resting heart rate?' },
  { metric: 'systolic', howTo: 'Cuff on upper arm at heart level. Stay still and quiet during the reading.', min: 70, max: 200, step: 1, ask: 'What is your systolic blood pressure? The top number.' },
  { metric: 'spo2', howTo: 'Clip the oximeter on a warm finger and wait for a steady number.', min: 80, max: 100, step: 1, ask: 'What is your blood oxygen percentage?' },
  { metric: 'temperature', howTo: 'Thermometer under the tongue, mouth closed, until it beeps.', min: 34, max: 41, step: 0.1, ask: 'What is your temperature, in degrees Celsius?' },
  { metric: 'sleepHours', howTo: 'From your actigraphy watch, or your best estimate.', min: 0, max: 12, step: 0.25, ask: 'How many hours did you sleep?' },
  { metric: 'mood', howTo: '1 = very low, 10 = excellent. Your answer stays private unless you share it.', min: 1, max: 10, step: 1, ask: 'How is your mood, from one to ten?' },
]

interface Props {
  env: EnvironmentId
  onOpenSystem: (id: SystemId) => void
  onEmergency: () => void
  onOpenTab: (tab: AppTab) => void
  /** Shown as "Back to Today" once the check-in is complete. */
  onFinish?: () => void
}

export function CheckInScreen({ env, onOpenSystem, onEmergency, onOpenTab, onFinish }: Props) {
  const { complete, crewId } = useRoutine()
  // Saved per crew member per day, so leaving the tab (or reloading) resumes the check-in.
  const progressKey = `halo.checkin.${crewId}.${today()}`
  const [progress, setProgress] = usePersistentState<{ i: number; values: Partial<Record<MetricId, number>> }>(progressKey, { i: 0, values: {} })
  const i = progress.i
  const values = progress.values
  // Accept a value or an updater (the voice check-in uses updaters), like React's own setters.
  type Vals = Partial<Record<MetricId, number>>
  const setI = (n: number | ((prev: number) => number)) => setProgress((p) => ({ ...p, i: typeof n === 'function' ? n(p.i) : n }))
  const setValues = (v: Vals | ((prev: Vals) => Vals)) => setProgress((p) => ({ ...p, values: typeof v === 'function' ? v(p.values) : v }))
  const [camera, setCamera] = useState(false)
  const [camKey, setCamKey] = useState(0)
  const [fromCamera, setFromCamera] = useState<Set<MetricId>>(new Set())
  const done = i >= STEPS.length
  const e = ENVIRONMENTS[env]
  const cur = STEPS[Math.min(i, STEPS.length - 1)]
  const curDef = METRICS[cur.metric]

  // Ask HALO knows which measurement is on screen, so "how do I do this?" just works.
  const drawer = (
    <AskHalo
      context={{
        screen: 'daily check-in',
        environment: { kind: e.kind, place: e.label, gravity: e.gravity },
        currentMeasurement: done ? null : { name: curDef.label, unit: curDef.unit, appInstructions: cur.howTo, step: `${i + 1} of ${STEPS.length}` },
        enteredSoFar: Object.fromEntries(Object.entries(values).map(([k, v]) => [METRICS[k as MetricId].label, `${v} ${METRICS[k as MetricId].unit}`.trim()])),
      }}
      subtitle="Help with this measurement: how to take it and what it means"
      starters={[`How do I measure ${curDef.label.toLowerCase()} in ${e.gravity === '0 g' ? 'zero g' : 'this gravity'}?`, `Why does ${curDef.label.toLowerCase()} matter in space?`, 'What if my value looks unusual?']}
      onOpenSystem={onOpenSystem}
      onEmergency={onEmergency}
      onOpenTab={onOpenTab}
    />
  )
  const shell = (content: ReactNode) => (
    <div className="relative h-full min-h-[520px] overflow-hidden">
      <div className="h-full overflow-y-auto pr-14">{content}</div>
      {drawer}
    </div>
  )

  useEffect(() => {
    if (done) complete('checkin')
  }, [done, complete])

  // --- Voice: HALO asks each question aloud and listens for the number ---
  const [handsFree, setHandsFree] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState('')
  const tries = useRef(0)
  const heardRef = useRef<(t: string) => void>(() => {})
  const { listening, heard, error: voiceError, listen, stop } = useListener((t) => heardRef.current(t))

  heardRef.current = (text: string) => {
    if (i >= STEPS.length) return
    const st = STEPS[i]
    const cmd = parseCommand(text)
    if (cmd === 'skip') return setI(i + 1)
    if (cmd === 'back') return setI(Math.max(0, i - 1))
    if (cmd === 'repeat') return speak(st.ask ?? METRICS[st.metric].label, listen)
    const n = parseSpokenNumber(text)
    if (n === null || n < st.min || n > st.max) {
      tries.current++
      const msg = n === null ? 'I didn’t catch a number' : `${n} is outside ${st.min} to ${st.max}`
      setVoiceMsg(`${msg}. Say it again, or say “skip”.`)
      if (handsFree && tries.current < 3) speak(`${msg}. Please say it again.`, listen)
      return
    }
    const v = Math.round(n / st.step) * st.step
    const rounded = Number(v.toFixed(2))
    setValues((prev) => ({ ...prev, [st.metric]: rounded }))
    setFromCamera((prev) => new Set([...prev].filter((m) => m !== st.metric)))
    setVoiceMsg(`Heard “${text}”: ${rounded}`)
    if (handsFree) speak(`${rounded}. Saved.`, () => setI((x) => (x === i ? x + 1 : x)))
  }

  useEffect(() => {
    if (!handsFree || i >= STEPS.length) return
    tries.current = 0
    setVoiceMsg('')
    speak(STEPS[i].ask ?? METRICS[STEPS[i].metric].label, listen)
    return () => {
      stop()
      window.speechSynthesis?.cancel()
    }
  }, [i, handsFree, listen, stop])

  useEffect(() => {
    if (done && handsFree) speak('Check-in complete. Nice work.')
  }, [done, handsFree])

  if (done) {
    return shell(
      <div className="mx-auto max-w-xl p-6">
        <h2 className="mb-1 text-2xl font-bold">Check-in complete <CircleCheck className={`text-nominal ${inl}`} /></h2>
        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-nominal">+30 XP · streak kept alive</p>
        <ul className="rounded-xl bg-space-900 p-4">
          {Object.entries(values).map(([k, v]) => (
            <li key={k} className="flex justify-between py-1">
              <span className="text-ink-dim">{METRICS[k as MetricId].label}</span>
              <span className="font-bold">
                {v} {METRICS[k as MetricId].unit}
                {fromCamera.has(k as MetricId) && <span className="ml-2 font-mono text-[10px] text-accent">CAMERA</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-3">
          <button onClick={() => { setI(0); setValues({}); setFromCamera(new Set()) }} className="min-h-11 rounded-lg bg-space-800 px-4">
            Start again
          </button>
          {onFinish && (
            <button onClick={onFinish} className="min-h-11 flex-1 rounded-lg bg-accent px-4 font-bold text-space-950">
              Back to Today
            </button>
          )}
        </div>
      </div>,
    )
  }

  const s = STEPS[i]
  const def = METRICS[s.metric]
  const val = values[s.metric] ?? Math.round(((s.min + s.max) / 2) / s.step) * s.step

  return shell(
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <div className="h-2 overflow-hidden rounded bg-space-800">
        <div className="h-full bg-accent transition-all" style={{ width: `${(i / STEPS.length) * 100}%` }} />
      </div>
      <div className="flex items-start gap-3">
        <h2 className="flex-1 text-2xl font-bold">{def.label}</h2>
        {voiceSupported() && (
          <button
            onClick={() => setHandsFree((h) => !h)}
            className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase tracking-wider ${handsFree ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-ink-dim hover:text-ink'}`}
            aria-pressed={handsFree}
            title="HALO reads each question aloud and listens for your answer"
          >
            <Mic className={inl} /> Hands-free {handsFree ? 'on' : 'off'}
          </button>
        )}
      </div>
      <p className="text-ink-dim">{s.howTo}</p>
      {voiceSupported() && (
        <div className="flex items-center gap-3 rounded-lg bg-black/25 px-3 py-2 text-sm">
          <button
            onClick={() => (listening ? stop() : listen())}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg ${listening ? 'animate-pulse border-warning bg-warning/20 text-warning' : 'border-white/15 text-ink-dim hover:text-ink'}`}
            aria-label={listening ? 'Stop listening' : 'Answer by voice'}
          >
            <Mic aria-hidden className="h-5 w-5" />
          </button>
          <span className="flex-1 text-ink-dim">
            {listening ? <>Listening… <span className="text-ink">{heard}</span></> : voiceError ? <span className="text-caution"><ToneIcon tone="caution" /> {voiceError}</span> : voiceMsg || 'Tap the mic and say the number, or “skip”, “back”, “repeat”.'}
          </span>
        </div>
      )}
      {s.metric === 'heartRate' && !camera && (
        <button
          onClick={() => setCamera(true)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-warning/40 bg-warning/10 font-semibold text-warning hover:bg-warning/15"
        >
          <Camera aria-hidden className={inl} /> No monitor? Measure with the camera
        </button>
      )}
      {s.metric === 'heartRate' && camera && (
        <CameraPulse
          key={camKey}
          onCancel={() => setCamera(false)}
          onRetry={() => setCamKey((k) => k + 1)}
          onResult={(bpm) => {
            setValues({ ...values, heartRate: bpm })
            setFromCamera(new Set([...fromCamera, 'heartRate']))
            setCamera(false)
          }}
        />
      )}
      <div className="text-center text-6xl font-black">
        {val} <span className="text-2xl font-normal text-ink-dim">{def.unit}</span>
        {fromCamera.has(s.metric) && <div className="mt-1 font-mono text-xs font-normal tracking-wider text-accent">MEASURED BY CAMERA</div>}
      </div>
      <input
        type="range"
        min={s.min}
        max={s.max}
        step={s.step}
        value={val}
        onChange={(e) => {
          setValues({ ...values, [s.metric]: Number(e.target.value) })
          if (fromCamera.has(s.metric)) setFromCamera(new Set([...fromCamera].filter((m) => m !== s.metric)))
        }}
        className="h-11 w-full accent-[var(--color-accent)]"
        aria-label={def.label}
      />
      <div className="flex gap-3">
        <button onClick={() => { setCamera(false); setVoiceMsg(''); setI(i + 1) }} className="min-h-12 flex-1 rounded-lg bg-space-800 text-ink-dim">
          Skip
        </button>
        <button
          onClick={() => { setValues({ ...values, [s.metric]: val }); setCamera(false); setVoiceMsg(''); setI(i + 1) }}
          className="min-h-12 flex-[2] rounded-lg bg-accent font-bold text-space-950"
        >
          Save & next
        </button>
      </div>
    </div>,
  )
}
