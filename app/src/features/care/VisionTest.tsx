import { useState } from 'react'
import { DAY_MS, relTime, useCrewStore } from '../../state/crewStore'
import { useRoutine } from '../../state/routine'

// Amsler grid: a 20×20 grid with a centre dot. Wavy, blurry or missing squares can be an early
// sign of the eye changes seen on long missions (SANS). Marked squares are compared week to week.

const N = 20

interface VisionResult {
  at: number
  left: number[]
  right: number[]
}

function seedVision(crewId: string): VisionResult[] {
  const now = Date.now()
  const base = [{ at: now - 14 * DAY_MS, left: [], right: [] }]
  // Mission Specialist: a small distorted patch first seen last week (right eye, near centre).
  if (crewId === 'c4') return [...base, { at: now - 7 * DAY_MS, left: [], right: [189, 190] }]
  return [...base, { at: now - 7 * DAY_MS, left: [], right: [] }]
}

export function VisionTest({ crewId }: { crewId: string }) {
  const [history, setHistory] = useCrewStore<VisionResult[]>('vision', crewId, seedVision)
  const { complete } = useRoutine()
  const [eye, setEye] = useState<'left' | 'right'>('left')
  const [marks, setMarks] = useState<{ left: Set<number>; right: Set<number> }>({ left: new Set(), right: new Set() })
  const [saved, setSaved] = useState<VisionResult | null>(null)
  const prev = history[history.length - 1]

  const toggle = (i: number) =>
    setMarks((m) => {
      const s = new Set(m[eye])
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return { ...m, [eye]: s }
    })

  const save = () => {
    const r = { at: Date.now(), left: [...marks.left], right: [...marks.right] }
    setHistory((h) => [...h, r].slice(-26))
    setSaved(r)
    complete('vision', 'weekly')
  }

  const newIn = (r: VisionResult, which: 'left' | 'right') => r[which].filter((i) => !prev?.[which].includes(i)).length
  const shown = saved ?? null

  if (shown) {
    const compareTo = history[history.length - 2]
    const nl = shown.left.filter((i) => !compareTo?.left.includes(i)).length
    const nr = shown.right.filter((i) => !compareTo?.right.includes(i)).length
    const any = shown.left.length + shown.right.length
    return (
      <div className="glass flex flex-col gap-3 p-4">
        <div className="section-h !mb-0">Result</div>
        {nl + nr > 0 ? (
          <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
            ◆ New distortion since last week: {nl > 0 && `${nl} square${nl > 1 ? 's' : ''} in the left eye`}
            {nl > 0 && nr > 0 && ', '}
            {nr > 0 && `${nr} square${nr > 1 ? 's' : ''} in the right eye`}. Report this to the flight surgeon and schedule an eye ultrasound (Body tab → Ultrasound → Eye).
          </p>
        ) : any > 0 ? (
          <p className="rounded-lg bg-caution/10 p-3 text-sm text-caution">▲ Same distortion as before, no new areas. Keep testing weekly.</p>
        ) : (
          <p className="rounded-lg bg-nominal/10 p-3 text-sm text-nominal">● No distortion in either eye. See you next week.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(['left', 'right'] as const).map((w) => (
            <div key={w}>
              <div className="mb-1 font-mono text-xs uppercase text-ink-dim">{w} eye</div>
              <MiniGrid marked={shown[w]} previous={compareTo?.[w] ?? []} />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setSaved(null)
            setMarks({ left: new Set(), right: new Set() })
            setEye('left')
          }}
          className="min-h-11 rounded-lg bg-space-800 text-sm"
        >
          Test again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="glass flex flex-col items-center gap-3 p-4">
        <div className="flex gap-2">
          {(['left', 'right'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setEye(w)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${eye === w ? 'bg-accent text-space-950' : 'bg-space-800 text-ink-dim'}`}
              aria-pressed={eye === w}
            >
              {w === 'left' ? 'Left eye' : 'Right eye'} {marks[w].size > 0 && `· ${marks[w].size}`}
            </button>
          ))}
        </div>
        <div
          className="relative grid aspect-square w-[min(420px,80vw)] border border-white/70 bg-black"
          style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
          role="grid"
          aria-label={`Amsler grid, ${eye} eye`}
        >
          {Array.from({ length: N * N }, (_, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`border-[0.5px] border-white/45 ${marks[eye].has(i) ? 'bg-caution/70' : 'hover:bg-white/10'}`}
              aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}${marks[eye].has(i) ? ', marked' : ''}`}
            />
          ))}
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="glass p-4 text-sm">
          <div className="section-h">How to test</div>
          <ol className="list-inside list-decimal space-y-1">
            <li>Wear your normal glasses. Hold the screen at reading distance (about 35 cm).</li>
            <li>Cover your {eye === 'left' ? 'right' : 'left'} eye.</li>
            <li>Keep looking at the white centre dot. Don’t look around.</li>
            <li>Tap any square that looks wavy, blurry, dark or missing.</li>
            <li>Switch eyes and repeat, then save.</li>
          </ol>
        </div>
        <div className="glass p-4 text-sm">
          <div className="section-h">Why</div>
          <p className="text-ink-dim">
            In weightlessness, fluid shifts toward the head and can swell the optic nerve and flatten the back of the eye. This is called SANS, and it can change
            eyesight slowly without pain.
          </p>
          {prev && (
            <p className="mt-2 font-mono text-xs text-ink-dim">
              Last test {relTime(prev.at)}: left {prev.left.length} · right {prev.right.length} marked
              {(newIn({ at: 0, left: [...marks.left], right: [...marks.right] }, 'left') > 0 || newIn({ at: 0, left: [...marks.left], right: [...marks.right] }, 'right') > 0) && (
                <span className="text-caution"> · ▲ new squares marked</span>
              )}
            </p>
          )}
        </div>
        <button onClick={save} className="min-h-12 rounded-lg bg-accent font-semibold text-space-950">
          Save both eyes {marks.left.size + marks.right.size === 0 && '· no distortion'}
        </button>
      </div>
    </div>
  )
}

function MiniGrid({ marked, previous }: { marked: number[]; previous: number[] }) {
  return (
    <div className="grid aspect-square w-full max-w-[180px] border border-white/30 bg-black" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
      {Array.from({ length: N * N }, (_, i) => (
        <span
          key={i}
          className={`border-[0.5px] border-white/15 ${marked.includes(i) ? (previous.includes(i) ? 'bg-caution/60' : 'bg-warning') : ''}`}
        />
      ))}
    </div>
  )
}
