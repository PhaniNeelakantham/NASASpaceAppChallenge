import { useEffect, useRef, useState } from 'react'
import type { PvtResult } from '../../state/routine'

// A 5-round version of the Psychomotor Vigilance Test (PVT) that ISS crews use to spot fatigue.
// Responses slower than 500 ms count as "lapses".
const ROUNDS = 5
const LAPSE_MS = 500

type Phase = 'ready' | 'wait' | 'go' | 'early' | 'done'

export function ReactionTest({ onDone, onClose }: { onDone: (r: PvtResult) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [trials, setTrials] = useState<number[]>([])
  const [last, setLast] = useState<number | null>(null)
  const shownAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = () => {
    setPhase('wait')
    timer.current = window.setTimeout(() => {
      shownAt.current = performance.now()
      setPhase('go')
    }, 1500 + Math.random() * 2500)
  }

  const tap = () => {
    if (phase === 'ready' || phase === 'early') return arm()
    if (phase === 'wait') {
      window.clearTimeout(timer.current)
      return setPhase('early')
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - shownAt.current)
      const next = [...trials, ms]
      setTrials(next)
      setLast(ms)
      if (next.length >= ROUNDS) {
        setPhase('done')
        const sorted = [...next].sort((a, b) => a - b)
        onDone({ medianMs: sorted[Math.floor(sorted.length / 2)], lapses: next.filter((t) => t > LAPSE_MS).length, trials: next })
      } else arm()
    }
  }

  const sorted = [...trials].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const lapses = trials.filter((t) => t > LAPSE_MS).length

  return (
    <div className="glass flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="section-h !mb-0">
          Reaction test · round {Math.min(trials.length + 1, ROUNDS)} / {ROUNDS}
        </span>
        <button onClick={onClose} className="font-mono text-xs uppercase tracking-wider text-ink-dim hover:text-ink">
          Close
        </button>
      </div>

      {phase !== 'done' ? (
        <button
          onPointerDown={tap}
          className={`grid h-48 select-none place-items-center rounded-2xl border text-center transition-colors ${
            phase === 'go'
              ? 'border-nominal bg-nominal/20'
              : phase === 'early'
                ? 'border-caution/60 bg-caution/10'
                : 'border-white/10 bg-black/30'
          }`}
        >
          {phase === 'ready' && <span className="text-lg font-semibold">Tap here to start</span>}
          {phase === 'wait' && <span className="font-mono text-sm uppercase tracking-widest text-ink-dim">Wait for the target…</span>}
          {phase === 'go' && <span className="h-16 w-16 rounded-full bg-nominal shadow-[0_0_40px_var(--color-nominal)]" aria-label="Tap now" />}
          {phase === 'early' && (
            <span>
              <b className="text-caution">▲ Too early</b>
              <br />
              <span className="text-sm text-ink-dim">Tap to try this round again</span>
            </span>
          )}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-black/30 p-3">
            <div className="section-h">Median</div>
            <div className="font-mono text-3xl font-bold">{median} ms</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3">
            <div className="section-h">Lapses (&gt; {LAPSE_MS} ms)</div>
            <div className={`font-mono text-3xl font-bold ${lapses ? 'text-caution' : 'text-nominal'}`}>{lapses}</div>
          </div>
          <p className="col-span-2 text-sm text-ink-dim">
            {lapses === 0 && median < 350
              ? '● Alert and sharp. Nice.'
              : lapses <= 1
                ? '▲ A little slow. Watch your sleep tonight.'
                : '◆ Several lapses: you may be fatigued. Avoid critical tasks until you rest, and log your sleep.'}
          </p>
        </div>
      )}
      {last !== null && phase !== 'done' && <p className="text-center font-mono text-xs text-ink-dim">Last: {last} ms</p>}
    </div>
  )
}
