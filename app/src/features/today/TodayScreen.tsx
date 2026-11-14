import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BADGES, DAILY_TASKS, WATER_GOAL, WATER_ML, WEEKLY_TASKS, type RoutineTask } from '../../content/routine'
import { SYSTEMS } from '../../content/systems'
import { CREW } from '../../data/syntheticCrew'
import { ENVIRONMENTS, type EnvironmentId } from '../../state/mission'
import { BADGE_BY_ID, useRoutine, type TaskState } from '../../state/routine'
import type { Status, SystemId } from '../../types'
import type { CareTool } from '../care/CareScreen'
import { ReactionTest } from './ReactionTest'

interface Props {
  statuses: Record<SystemId, Status>
  env: EnvironmentId
  onCheckIn: () => void
  onOpenCare: (t: CareTool) => void
}

const OPEN_LABEL: Record<CareTool, string> = {
  photos: 'Open photos',
  vision: 'Start vision test',
  buddy: 'Open buddy check',
  journal: 'Write in journal',
  medkit: 'Open med kit',
  landing: 'Start test',
}

const STATE_META: Record<TaskState, { shape: string; word: string; text: string; border: string }> = {
  done: { shape: '●', word: 'Done', text: 'text-nominal', border: 'border-nominal/25' },
  due: { shape: '▲', word: 'Due now', text: 'text-accent', border: 'border-accent/50 shadow-[0_0_24px_-8px_var(--color-accent)]' },
  overdue: { shape: '◆', word: 'Overdue', text: 'text-caution', border: 'border-caution/45' },
  upcoming: { shape: '○', word: 'Later', text: 'text-ink-dim', border: 'border-white/5' },
  open: { shape: '○', word: 'This week', text: 'text-ink-dim', border: 'border-white/5' },
}

const CREW_GOAL = 0.85
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
const btn = 'min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors'

function Ring({ pct, size = 64, children }: { pct: number; size?: number; children?: ReactNode }) {
  const r = 15.9
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--color-nominal)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${pct * 100} 100`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: 'drop-shadow(0 0 4px var(--color-nominal))' }}
        />
      </svg>
      {children}
    </div>
  )
}

function TaskCard({ task, statuses, onCheckIn, onOpenCare }: { task: RoutineTask; statuses: Record<SystemId, Status>; onCheckIn: () => void; onOpenCare: (t: CareTool) => void }) {
  const r = useRoutine()
  const [pvtOpen, setPvtOpen] = useState(false)
  const state = r.stateOf(task)
  const meta = STATE_META[state]
  const flagged = statuses[task.system] === 'warning' || statuses[task.system] === 'caution'
  const sickRest = (task.id === 'exercise-res' || task.id === 'exercise-cardio') && statuses.immune === 'warning'

  let action: ReactNode = null
  if (task.action === 'checkin') {
    action =
      state === 'done' ? null : (
        <button onClick={onCheckIn} className={`${btn} bg-accent text-space-950 hover:brightness-110`}>
          Start check-in →
        </button>
      )
  } else if (task.action === 'water') {
    action = (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" aria-label={`${r.today.water} of ${WATER_GOAL} glasses`}>
          {Array.from({ length: WATER_GOAL }, (_, i) => (
            <span
              key={i}
              className={`h-6 w-3.5 rounded-b-md rounded-t-sm border transition-colors ${
                i < r.today.water ? 'border-accent bg-accent/70 shadow-[0_0_8px_var(--color-accent)]' : 'border-white/15 bg-transparent'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-ink-dim">
          {((r.today.water * WATER_ML) / 1000).toFixed(2)} / {((WATER_GOAL * WATER_ML) / 1000).toFixed(1)} L
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => r.addWater(-1)} className={`${btn} bg-space-800 px-3`} aria-label="Remove a glass">
            −
          </button>
          <button onClick={() => r.addWater(1)} className={`${btn} bg-accent/15 text-accent hover:bg-accent/25`}>
            + Glass
          </button>
        </div>
      </div>
    )
  } else if (task.action === 'pvt') {
    action = pvtOpen ? (
      <ReactionTest onDone={(res) => r.recordPvt(res)} onClose={() => setPvtOpen(false)} />
    ) : (
      <div className="flex items-center gap-3">
        {r.today.pvt && (
          <span className="font-mono text-xs text-ink-dim">
            {r.today.pvt.medianMs} ms median · {r.today.pvt.lapses} lapse{r.today.pvt.lapses === 1 ? '' : 's'}
          </span>
        )}
        <button onClick={() => setPvtOpen(true)} className={`${btn} ml-auto ${state === 'done' ? 'bg-space-800' : 'bg-accent text-space-950 hover:brightness-110'}`}>
          {state === 'done' ? 'Retake' : 'Start test'}
        </button>
      </div>
    )
  } else if (task.open && state !== 'done') {
    const tool = task.open
    action = (
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onOpenCare(tool)} className={`${btn} bg-accent text-space-950 hover:brightness-110`}>
          {OPEN_LABEL[tool]} →
        </button>
        {tool === 'journal' && (
          <button onClick={() => r.complete(task.id, task.cadence)} className={`${btn} bg-space-800`}>
            Mark done
          </button>
        )}
      </div>
    )
  } else {
    action =
      state === 'done' ? (
        <button onClick={() => r.undo(task.id, task.cadence)} className={`${btn} bg-transparent text-ink-dim hover:text-ink`}>
          Undo
        </button>
      ) : (
        <button onClick={() => r.complete(task.id, task.cadence)} className={`${btn} bg-accent text-space-950 hover:brightness-110`}>
          {sickRest ? 'Log rest day' : 'Mark done'}
        </button>
      )
  }

  return (
    <motion.li layout className={`glass flex flex-col gap-2 border p-4 ${meta.border} ${state === 'done' ? 'opacity-75' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`font-mono text-xs font-semibold ${meta.text}`}>
          {meta.shape} {meta.word}
        </span>
        {task.window && <span className="font-mono text-xs text-ink-dim">{hh(task.window[0])}–{hh(task.window[1])}</span>}
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
          {task.hazard}
        </span>
        {flagged && state !== 'done' && (
          <span className="rounded-full bg-caution/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-caution">
            ▲ Priority · {SYSTEMS[task.system].label}
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-accent">+{task.xp} XP</span>
      </div>
      <h3 className={`text-lg font-semibold ${state === 'done' ? 'line-through decoration-nominal/60' : ''}`}>{task.label}</h3>
      <p className="text-sm">{task.howTo}</p>
      <p className="text-xs text-ink-dim">Why: {task.why}</p>
      {sickRest && state !== 'done' && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          ◆ Fever flagged. Skip hard exercise today and rest. Logging a rest day keeps your streak.
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </motion.li>
  )
}

export function TodayScreen({ statuses, env, onCheckIn, onOpenCare }: Props) {
  const r = useRoutine()
  const { stats } = r
  const environment = ENVIRONMENTS[env]
  const clock = new Date(r.now)
  const extras = environment.checklist.filter((c) => !/check-in/i.test(c))
  const doneCount = DAILY_TASKS.filter((t) => r.isDone(t.id)).length
  const crewAvg = r.crewWeek.reduce((s, c) => s + c.pct, 0) / r.crewWeek.length
  const newBadge = r.newBadge ? BADGE_BY_ID[r.newBadge] : null
  const [gain, setGain] = useState<typeof r.lastGain>(null)
  useEffect(() => {
    if (!r.lastGain || Date.now() - r.lastGain.at > 3000) return
    setGain(r.lastGain)
    const t = setTimeout(() => setGain(null), 1800)
    return () => clearTimeout(t)
  }, [r.lastGain])

  const streaks = [
    { label: 'Check-in', n: stats.streaks.checkin },
    { label: 'Workouts', n: stats.streaks.exercise },
    { label: 'Hydration', n: stats.streaks.water },
    { label: 'Sleep routine', n: stats.streaks.sleep },
  ]

  return (
    <div className="relative mx-auto grid max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-[1fr_340px]">
      {/* XP gain */}
      <AnimatePresence>
        {gain && (
          <motion.div
            key={gain.at}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none fixed right-6 top-24 z-40 rounded-xl border border-nominal/40 bg-space-900/90 px-4 py-2 font-mono text-lg font-bold text-nominal shadow-[0_0_30px_-6px_var(--color-nominal)]"
          >
            +{gain.xp} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone recorded */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-space-950/70 backdrop-blur-sm"
            onClick={r.clearNewBadge}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="glass flex flex-col items-center gap-3 p-8 text-center"
            >
              <span className="section-h !mb-0 text-accent">Milestone recorded</span>
              <span className="grid h-20 w-20 place-items-center rounded-xl border border-accent/60 bg-accent/10 font-mono text-2xl font-bold text-accent">
                {newBadge.glyph}
              </span>
              <span className="text-2xl font-bold">{newBadge.label}</span>
              <span className="text-sm text-ink-dim">{newBadge.how}</span>
              <button onClick={r.clearNewBadge} className={`${btn} mt-2 bg-accent text-space-950`}>
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-center gap-4">
          <Ring pct={doneCount / DAILY_TASKS.length}>
            <span className="font-mono text-sm font-bold">
              {doneCount}/{DAILY_TASKS.length}
            </span>
          </Ring>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Today’s routine</h2>
            <p className="text-sm text-ink-dim">
              {clock.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} ·{' '}
              <span className="font-mono">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> · {environment.label}
            </p>
          </div>
          <label className="flex flex-col leading-tight">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-dim">Demo clock</span>
            <select
              value={r.demoHour ?? ''}
              onChange={(e) => r.setDemoHour(e.target.value === '' ? null : Number(e.target.value))}
              className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-xs text-ink outline-none"
              aria-label="Demo clock"
            >
              <option value="" className="bg-space-900">
                Real time
              </option>
              {[7, 10, 13, 15, 18, 21].map((h) => (
                <option key={h} value={h} className="bg-space-900">
                  {hh(h)}
                </option>
              ))}
            </select>
          </label>
        </header>

        <ul className="flex flex-col gap-3">
          {DAILY_TASKS.map((t) => (
            <TaskCard key={t.id} task={t} statuses={statuses} onCheckIn={onCheckIn} onOpenCare={onOpenCare} />
          ))}
        </ul>

        {extras.length > 0 && (
          <div className="glass p-4">
            <div className="section-h">Mission extras · {environment.kind}</div>
            <ul className="flex flex-col gap-1">
              {extras.map((c) => {
                const id = `env:${c}`
                const done = r.isDone(id)
                return (
                  <li key={c}>
                    <button
                      onClick={() => (done ? r.undo(id) : r.complete(id))}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-white/[0.04]"
                      aria-pressed={done}
                    >
                      <span className={`grid h-5 w-5 place-items-center rounded border ${done ? 'border-nominal bg-nominal text-space-950' : 'border-white/25'}`}>
                        {done ? '✓' : ''}
                      </span>
                      <span className={done ? 'text-ink-dim line-through' : ''}>{c}</span>
                      <span className="ml-auto font-mono text-xs text-accent">+10 XP</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div>
          <div className="section-h mt-2">This week</div>
          <ul className="flex flex-col gap-3">
            {WEEKLY_TASKS.map((t) => (
              <TaskCard key={t.id} task={t} statuses={statuses} onCheckIn={onCheckIn} onOpenCare={onOpenCare} />
            ))}
          </ul>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="glass p-4">
          <div className="flex items-center gap-4">
            <Ring pct={stats.level.into / stats.level.next} size={72}>
              <div className="text-center leading-none">
                <div className="font-mono text-[9px] text-ink-dim">LVL</div>
                <div className="font-mono text-2xl font-black">{stats.level.level}</div>
              </div>
            </Ring>
            <div>
              <div className="text-lg font-bold">Level {stats.level.level}</div>
              <div className="font-mono text-xs text-ink-dim">
                {stats.xp.toLocaleString()} XP · {stats.level.next - stats.level.into} to next level
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="section-h">Streaks</div>
          <div className="grid grid-cols-2 gap-2">
            {streaks.map((s) => (
              <div key={s.label} className="rounded-xl bg-black/25 p-3">
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono text-2xl font-black ${s.n >= 7 ? 'text-caution' : s.n > 0 ? 'text-ink' : 'text-ink-dim'}`}>{s.n}</span>
                  <span className="font-mono text-xs text-ink-dim">days</span>
                </div>
                <div className="text-xs text-ink-dim">{s.label}</div>
              </div>
            ))}
          </div>
          {stats.checkinAtRisk && stats.streaks.checkin > 0 && (
            <p className="mt-3 rounded-lg bg-caution/10 px-3 py-2 text-xs text-caution">
              ▲ Your {stats.streaks.checkin}-day check-in streak ends tonight. Do today’s check-in to keep it.
            </p>
          )}
          <div className="mt-3 flex justify-between gap-1">
            {r.recent.map(({ key, log }, i) => {
              const pct = DAILY_TASKS.filter((t) => log.done[t.id]).length / DAILY_TASKS.length
              return (
                <div key={key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-12 w-full items-end overflow-hidden rounded bg-white/[0.04]">
                    <div className="w-full rounded bg-nominal/70" style={{ height: `${pct * 100}%` }} />
                  </div>
                  <span className="font-mono text-[9px] text-ink-dim">
                    {i === 6 ? 'Today' : new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass p-4">
          <div className="section-h">
            Milestones · {stats.badges.size}/{BADGES.length}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BADGES.map((b) => {
              const got = stats.badges.has(b.id)
              return (
                <div key={b.id} title={`${b.label} — ${b.how}`} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-lg border font-mono text-[11px] font-bold ${
                      got ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/10 text-white/25'
                    }`}
                  >
                    {b.glyph}
                  </span>
                  <span className={`text-[10px] leading-tight ${got ? '' : 'text-ink-dim'}`}>{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass p-4">
          <div className="section-h">Crew goal · this week</div>
          <p className="mb-3 text-xs text-ink-dim">
            Hit {Math.round(CREW_GOAL * 100)} % of the routine together. A shared goal keeps the team connected on a long, isolated mission.
          </p>
          <div className="mb-3 flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-black ${crewAvg >= CREW_GOAL ? 'text-nominal' : 'text-caution'}`}>
              {Math.round(crewAvg * 100)} %
            </span>
            <span className="font-mono text-xs text-ink-dim">goal {Math.round(CREW_GOAL * 100)} %</span>
          </div>
          <ul className="flex flex-col gap-2">
            {r.crewWeek.map((c) => {
              const m = CREW.find((x) => x.id === c.crewId)
              return (
                <li key={c.crewId} className="flex items-center gap-2 text-xs">
                  <span className={`w-24 truncate ${c.crewId === r.crewId ? 'font-bold text-accent' : 'text-ink-dim'}`}>{m?.name}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded bg-white/[0.06]">
                    <div className="h-full rounded bg-nominal/70" style={{ width: `${c.pct * 100}%` }} />
                    <div className="absolute inset-y-0 w-px bg-ink/50" style={{ left: `${CREW_GOAL * 100}%` }} />
                  </div>
                  <span className="w-9 text-right font-mono">{Math.round(c.pct * 100)}%</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="glass flex items-center gap-3 p-4">
          <div className="flex-1">
            <div className="text-sm font-semibold">Reminders</div>
            <div className="text-xs text-ink-dim">
              {r.notificationsOn ? 'You’ll get a system notification when a task is due.' : 'In-app reminders are on. Turn on system notifications too?'}
            </div>
          </div>
          {!r.notificationsOn && (
            <button onClick={r.enableNotifications} className={`${btn} bg-space-800`}>
              Turn on
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
