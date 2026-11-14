import { useEffect, useState } from 'react'
import { DAY_MS, relTime, useCrewStore } from '../../state/crewStore'
import { ENVIRONMENTS, type EnvironmentId } from '../../state/mission'

// Landing readiness: a guided lying-to-standing ("orthostatic") test.
// After months without gravity, blood pools in the legs on standing and many astronauts get dizzy
// or faint on landing day. A big blood-pressure drop or heart-rate jump means: not ready yet.

interface Vitals {
  sys: number
  dia: number
  hr: number
}

interface Result {
  at: number
  lying: Vitals
  stand1: Vitals
  stand3: Vitals
  symptoms: string[]
  score: number
}

const SYMPTOMS = ['Dizzy / light-headed', 'Blurry or grey vision', 'Nausea', 'Legs feel weak']
const STEPS = [
  { key: 'lying', title: 'Lie down', secs: 300, text: 'Lie flat and still for 5 minutes, then measure blood pressure and heart rate.' },
  { key: 'stand1', title: 'Stand up — 1 minute', secs: 60, text: 'Stand up (have a crewmate nearby). After 1 minute, measure again.' },
  { key: 'stand3', title: 'Keep standing — 3 minutes', secs: 120, text: 'Stay standing, don’t lock your knees. At 3 minutes, measure one last time.' },
] as const

function score(lying: Vitals, s1: Vitals, s3: Vitals, symptoms: string[]) {
  const sysDrop = Math.max(lying.sys - s1.sys, lying.sys - s3.sys)
  const diaDrop = Math.max(lying.dia - s1.dia, lying.dia - s3.dia)
  const hrRise = Math.max(s1.hr - lying.hr, s3.hr - lying.hr)
  let sc = 100
  sc -= Math.max(0, sysDrop - 10) * 2.5
  sc -= Math.max(0, diaDrop - 5) * 2
  sc -= Math.max(0, hrRise - 15) * 1.5
  sc -= symptoms.length * 12
  return { score: Math.max(0, Math.min(100, Math.round(sc))), sysDrop, diaDrop, hrRise }
}

function seedLanding(): Result[] {
  const now = Date.now()
  return [
    { at: now - 21 * DAY_MS, lying: { sys: 116, dia: 74, hr: 60 }, stand1: { sys: 108, dia: 72, hr: 78 }, stand3: { sys: 110, dia: 74, hr: 76 }, symptoms: [], score: 92 },
    { at: now - 7 * DAY_MS, lying: { sys: 114, dia: 72, hr: 61 }, stand1: { sys: 98, dia: 66, hr: 88 }, stand3: { sys: 100, dia: 68, hr: 86 }, symptoms: ['Dizzy / light-headed'], score: 63 },
  ]
}

export function LandingTest({ crewId, env }: { crewId: string; env: EnvironmentId }) {
  const [history, setHistory] = useCrewStore<Result[]>('landing', crewId, seedLanding)
  const [step, setStep] = useState(-1)
  const [vals, setVals] = useState<Record<string, Vitals>>({})
  const [form, setForm] = useState<Vitals>({ sys: 115, dia: 75, hr: 65 })
  const [left, setLeft] = useState(0)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const e = ENVIRONMENTS[env]
  const zeroG = e.gravity.startsWith('0')

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return
    setLeft(STEPS[step].secs)
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [step])

  const next = () => {
    const key = STEPS[step].key
    const all = { ...vals, [key]: form }
    setVals(all)
    if (step < STEPS.length - 1) return setStep(step + 1)
    const s = score(all.lying, all.stand1, all.stand3, symptoms)
    const r = { at: Date.now(), lying: all.lying, stand1: all.stand1, stand3: all.stand3, symptoms, score: s.score }
    setHistory((h) => [...h, r].slice(-20))
    setResult(r)
    setStep(STEPS.length)
  }

  const verdict = (sc: number) =>
    sc >= 80 ? { t: '● Ready', c: 'text-nominal', bg: 'bg-nominal/10' } : sc >= 55 ? { t: '▲ Use caution', c: 'text-caution', bg: 'bg-caution/10' } : { t: '◆ Not ready', c: 'text-warning', bg: 'bg-warning/10' }

  const num = 'min-h-11 w-20 rounded-lg border border-white/10 bg-black/30 px-2 text-center font-mono outline-none focus:border-accent/60'

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {step === -1 && (
          <div className="glass flex flex-col gap-3 p-4">
            <div className="section-h !mb-0">Landing readiness test · about 8 minutes</div>
            <p className="text-sm">
              Checks how well your body keeps blood pressure up when you stand. You’ll need the blood-pressure cuff, and a crewmate nearby in case you get dizzy.
            </p>
            {zeroG && (
              <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">
                In zero g there is no “standing”. On the station or in transit, do this with the lower-body suction device (LBNP), which pulls blood toward the
                legs the way gravity will. Run it weekly in the last month before landing.
              </p>
            )}
            <button onClick={() => setStep(0)} className="min-h-12 rounded-lg bg-accent font-semibold text-space-950">
              Start test
            </button>
          </div>
        )}

        {step >= 0 && step < STEPS.length && (
          <div className="glass flex flex-col gap-4 p-4">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
              ))}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
                Step {step + 1} of {STEPS.length}
              </div>
              <h3 className="text-xl font-bold">{STEPS[step].title}</h3>
              <p className="text-sm text-ink-dim">{STEPS[step].text}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-mono text-5xl font-black ${left === 0 ? 'text-nominal' : ''}`}>
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
              </div>
              <button onClick={() => setLeft(0)} className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] uppercase text-ink-dim hover:text-ink">
                Demo: skip wait
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs text-ink-dim">
                Systolic
                <input type="number" value={form.sys} onChange={(ev) => setForm({ ...form, sys: Number(ev.target.value) })} className={num} />
              </label>
              <span className="pb-3 text-ink-dim">/</span>
              <label className="flex flex-col text-xs text-ink-dim">
                Diastolic
                <input type="number" value={form.dia} onChange={(ev) => setForm({ ...form, dia: Number(ev.target.value) })} className={num} />
              </label>
              <label className="flex flex-col text-xs text-ink-dim">
                Heart rate
                <input type="number" value={form.hr} onChange={(ev) => setForm({ ...form, hr: Number(ev.target.value) })} className={num} />
              </label>
            </div>
            {step === STEPS.length - 1 && (
              <div>
                <div className="mb-1 text-sm">Did you feel any of these while standing?</div>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSymptoms((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}
                      className={`min-h-9 rounded-full border px-3 text-xs ${symptoms.includes(s) ? 'border-caution bg-caution/15 text-caution' : 'border-white/10 text-ink-dim'}`}
                      aria-pressed={symptoms.includes(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">◆ If you feel faint at any point: sit or lie down right away and raise your legs. Stop the test.</p>
            <button onClick={next} disabled={left > 0} className="min-h-12 rounded-lg bg-accent font-semibold text-space-950 disabled:opacity-40">
              {left > 0 ? 'Wait for the timer…' : step < STEPS.length - 1 ? 'Save & next step' : 'See result'}
            </button>
          </div>
        )}

        {result && step === STEPS.length && (() => {
          const s = score(result.lying, result.stand1, result.stand3, result.symptoms)
          const v = verdict(result.score)
          return (
            <div className="glass flex flex-col gap-3 p-4">
              <div className="flex items-center gap-4">
                <div className={`grid h-24 w-24 place-items-center rounded-full border-4 font-mono text-3xl font-black ${v.c}`} style={{ borderColor: 'currentColor' }}>
                  {result.score}
                </div>
                <div>
                  <div className={`text-2xl font-bold ${v.c}`}>{v.t}</div>
                  <div className="font-mono text-xs text-ink-dim">
                    BP drop {s.sysDrop}/{s.diaDrop} mmHg · HR rise +{s.hrRise} bpm
                  </div>
                </div>
              </div>
              {(s.sysDrop >= 20 || s.diaDrop >= 10) && (
                <p className={`rounded-lg p-3 text-sm ${v.bg} ${v.c}`}>Blood pressure dropped a lot when you stood (orthostatic hypotension). This is the main cause of fainting on landing day.</p>
              )}
              {s.hrRise >= 30 && <p className={`rounded-lg p-3 text-sm ${v.bg} ${v.c}`}>Your heart rate jumped by {s.hrRise} bpm: your body is working hard to keep blood pressure up.</p>}
              <div>
                <div className="section-h">Before landing</div>
                <ul className="list-inside list-disc text-sm">
                  <li>Fluid loading: drink water with salt tablets in the hours before entry, as the crew surgeon directs</li>
                  <li>Wear the compression garment from suit-up until after landing</li>
                  <li>Keep up resistance exercise and cardio: they protect blood-pressure control</li>
                  <li>After landing: sit up slowly, move your legs, and let the recovery team help you stand</li>
                </ul>
              </div>
              <button onClick={() => { setStep(-1); setResult(null); setSymptoms([]) }} className="min-h-11 rounded-lg bg-space-800 text-sm">
                Done
              </button>
            </div>
          )
        })()}
      </div>

      <aside className="glass flex flex-col gap-3 p-4">
        <div className="section-h !mb-0">Readiness trend</div>
        <div className="flex h-28 items-end gap-2">
          {history.map((h) => {
            const v = verdict(h.score)
            return (
              <div key={h.at} className="flex flex-1 flex-col items-center gap-1" title={`${h.score} · ${relTime(h.at)}`}>
                <span className={`font-mono text-[10px] ${v.c}`}>{h.score}</span>
                <div className="w-full rounded-t bg-current opacity-70" style={{ height: `${h.score * 0.8}px`, color: h.score >= 80 ? '#2dd4bf' : h.score >= 55 ? '#fbbf24' : '#ff5a4e' }} />
                <span className="font-mono text-[9px] text-ink-dim">{relTime(h.at).replace(' ago', '')}</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-ink-dim">
          {history.length >= 2 && history[history.length - 1].score < history[history.length - 2].score - 10
            ? '▲ Your score is falling. Step up cardio and talk to the crew surgeon about the landing plan.'
            : 'Test weekly in the last month before landing to see the trend.'}
        </p>
        <p className="text-xs text-ink-dim">Crew: {crewId === 'c1' ? 'Commander — lands the vehicle, so readiness matters most.' : 'all crew test before entry.'}</p>
      </aside>
    </div>
  )
}
