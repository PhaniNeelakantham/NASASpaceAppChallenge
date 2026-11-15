import { inl, ToneIcon } from '../../components/ToneIcon'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Reading } from '../../types'

/* ---------------- audio + speech helpers ---------------- */

let audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
  try {
    audioCtx ??= new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

export function beep(freq = 880, ms = 70, gain = 0.15) {
  const a = ctx()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.frequency.value = freq
  g.gain.value = gain
  o.connect(g).connect(a.destination)
  o.start()
  o.stop(a.currentTime + ms / 1000)
}

export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

export function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ---------------- CPR coach ---------------- */

const BPM = 110
const CYCLE_MS = 2 * 60 * 1000

/**
 * Metronome at 110/min with a 30:2 counter. After 30 compressions it pauses for two breaths.
 * Every 2 minutes it tells the team to swap rescuers.
 */
export function CprCoach({ voice, onLog }: { voice: boolean; onLog: (t: string) => void }) {
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(0)
  const [breaths, setBreaths] = useState(false)
  const [cycles, setCycles] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const swapRef = useRef(0)

  useEffect(() => {
    if (!running) return
    let n = count
    let pauseUntil = 0
    const beat = setInterval(() => {
      const now = performance.now()
      if (now < pauseUntil) return
      if (pauseUntil) {
        pauseUntil = 0
        setBreaths(false)
      }
      n += 1
      beep(n === 30 ? 660 : 880)
      setCount(n)
      if (n >= 30) {
        n = 0
        setCycles((c) => c + 1)
        setBreaths(true)
        speak('Two breaths', voice)
        pauseUntil = now + 4500
      }
    }, 60000 / BPM)
    const clock = setInterval(() => {
      const e = performance.now() - startRef.current
      setElapsed(e)
      const swaps = Math.floor(e / CYCLE_MS)
      if (swaps > swapRef.current) {
        swapRef.current = swaps
        speak('Two minutes. Swap rescuers now.', voice)
        onLog(`CPR ${swaps * 2} min, rescuer swap prompted`)
      }
    }, 250)
    return () => {
      clearInterval(beat)
      clearInterval(clock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const toggle = () => {
    if (!running) {
      ctx()?.resume()
      if (startRef.current === 0) {
        startRef.current = performance.now()
        onLog('CPR started')
      }
    } else onLog(`CPR paused after ${fmt(elapsed)}`)
    setRunning((r) => !r)
  }

  const toSwap = CYCLE_MS - (elapsed % CYCLE_MS)
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-[auto_1fr]">
      <div className="grid place-items-center">
        <div
          className={`grid h-36 w-36 place-items-center rounded-full border-4 transition-transform duration-100 ${breaths ? 'border-caution' : 'border-warning'}`}
          style={{ transform: running && !breaths && count % 2 === 1 ? 'scale(0.92)' : 'scale(1)' }}
          aria-live="polite"
        >
          <div className="text-center">
            <div className={`text-5xl font-black tabular-nums ${breaths ? 'text-caution' : ''}`}>{breaths ? '2' : count}</div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-ink-dim">{breaths ? 'breaths' : 'of 30 pushes'}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <button onClick={toggle} className={`min-h-16 rounded-2xl text-xl font-black ${running ? 'border border-white/20 text-ink' : 'bg-warning text-space-950'}`}>
          {running ? 'Pause beat' : count === 0 && cycles === 0 ? 'Start CPR beat' : 'Resume beat'}
        </button>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-mono text-[10px] uppercase text-ink-dim">CPR time</div>
            <div className="text-xl font-bold tabular-nums">{fmt(elapsed)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-mono text-[10px] uppercase text-ink-dim">Cycles</div>
            <div className="text-xl font-bold tabular-nums">{cycles}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2">
            <div className="font-mono text-[10px] uppercase text-ink-dim">Swap in</div>
            <div className="text-xl font-bold tabular-nums">{fmt(toSwap)}</div>
          </div>
        </div>
        <p className="text-sm text-ink-dim">{BPM} beats per minute · 30 pushes : 2 breaths · swap rescuers every 2 min</p>
      </div>
    </div>
  )
}

/* ---------------- re-check timer ---------------- */

export function StepTimer({ seconds, voice, onLog }: { seconds: number; voice: boolean; onLog: (t: string) => void }) {
  const [left, setLeft] = useState(seconds * 1000)
  const done = useRef(false)
  useEffect(() => {
    const end = performance.now() + seconds * 1000
    const t = setInterval(() => {
      const l = end - performance.now()
      setLeft(l)
      if (l <= 0 && !done.current) {
        done.current = true
        beep(660, 200)
        speak('Time to re-check.', voice)
        onLog(`Re-check timer (${fmt(seconds * 1000)}) finished`)
        clearInterval(t)
      }
    }, 250)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])
  const pct = 1 - left / (seconds * 1000)
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={left <= 0 ? '#fbbf24' : '#7dd3fc'} strokeWidth="3" strokeDasharray={`${pct * 97.4} 97.4`} />
        </svg>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">{left <= 0 ? 'Re-check now' : 'Next re-check in'}</div>
        <div className={`text-3xl font-black tabular-nums ${left <= 0 ? 'text-caution' : ''}`}>{left <= 0 ? 'Now' : fmt(left)}</div>
      </div>
    </div>
  )
}

/* ---------------- quick vitals ---------------- */

interface Vit {
  hr: string
  sys: string
  dia: string
  spo2: string
  rr: string
}

function flag(v: Vit): string[] {
  const out: string[] = []
  const hr = Number(v.hr)
  const sys = Number(v.sys)
  const spo2 = Number(v.spo2)
  const rr = Number(v.rr)
  if (v.hr && (hr < 50 || hr > 120)) out.push(`Pulse ${hr} is outside 50–120`)
  if (v.sys && (sys < 90 || sys > 180)) out.push(`Systolic BP ${sys} is outside 90–180`)
  if (v.spo2 && spo2 < 94) out.push(`Oxygen ${spo2}% is low, give oxygen per the kit checklist`)
  if (v.rr && (rr < 10 || rr > 24)) out.push(`Breathing rate ${rr}/min is outside 10–24`)
  return out
}

export function VitalsQuick({ last, onLog }: { last?: Reading; onLog: (t: string) => void }) {
  const [v, setV] = useState<Vit>({ hr: '', sys: '', dia: '', spo2: '', rr: '' })
  const [logged, setLogged] = useState(0)
  const fields: { k: keyof Vit; label: string; unit: string; ph?: number }[] = [
    { k: 'hr', label: 'Pulse', unit: '/min', ph: last?.values.heartRate },
    { k: 'sys', label: 'BP systolic', unit: 'mmHg', ph: last?.values.systolic },
    { k: 'dia', label: 'BP diastolic', unit: 'mmHg', ph: last?.values.diastolic },
    { k: 'spo2', label: 'Oxygen', unit: '%', ph: last?.values.spo2 },
    { k: 'rr', label: 'Breaths', unit: '/min' },
  ]
  const flags = flag(v)
  const save = () => {
    const parts = fields.filter((f) => v[f.k]).map((f) => `${f.label} ${v[f.k]}${f.unit}`)
    if (parts.length === 0) return
    onLog(`Vitals: ${parts.join(', ')}${flags.length ? `. Warning: ${flags.join('; ')}` : ''}`)
    setLogged((n) => n + 1)
    setV({ hr: '', sys: '', dia: '', spo2: '', rr: '' })
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {fields.map((f) => (
          <label key={f.k} className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
              {f.label} <span className="normal-case">({f.unit})</span>
            </span>
            <input
              inputMode="numeric"
              value={v[f.k]}
              onChange={(e) => setV({ ...v, [f.k]: e.target.value.replace(/[^\d.]/g, '') })}
              placeholder={f.ph !== undefined ? `last ${f.ph}` : '-'}
              className="min-h-14 rounded-xl border border-white/15 bg-space-900 px-3 text-2xl font-bold tabular-nums outline-none placeholder:text-sm placeholder:font-normal placeholder:text-ink-dim focus:border-accent"
            />
          </label>
        ))}
      </div>
      {flags.length > 0 && (
        <ul className="mt-3 space-y-1">
          {flags.map((f) => (
            <li key={f} className="text-sm font-semibold text-warning">
              <ToneIcon tone="warning" /> {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} className="min-h-12 rounded-xl border border-accent/50 px-5 font-semibold text-accent hover:bg-accent/10">
          Log these vitals
        </button>
        {logged > 0 && <span className="text-sm text-nominal"><Check className={inl} /> Logged {logged}×</span>}
        <span className="text-xs text-ink-dim">Placeholders show the last HALO reading.</span>
      </div>
    </div>
  )
}
