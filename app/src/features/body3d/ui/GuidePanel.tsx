import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useComms } from '../../../state/comms'
import { useSpaceWeather } from '../../../state/spaceWeather'
import { ENVIRONMENTS, formatDelay, type EnvironmentId } from '../../../state/mission'
import type { SystemId } from '../../../types'
import type { SystemView } from '../health'
import { STATUS_HEX } from '../theme'
import { EnvironmentCard } from './EnvironmentCard'
import { SpaceWeatherCard } from './SpaceWeatherCard'

interface Props {
  env: EnvironmentId
  /** Issues to work through, worst first. */
  alerts: SystemView[]
  priorities: Set<SystemId>
  /** Systems whose full details the astronaut has opened. */
  reviewed: Set<SystemId>
  onShow: (id: SystemId) => void
  onOpenProcedure: (id: SystemId) => void
  onCheckIn: () => void
}

interface Step {
  key: string
  title: string
  detail: string
  done: boolean
  color?: string
  action?: { label: string; run: () => void }
  extra?: React.ReactNode
}

function headline(alerts: SystemView[]): { text: string; tone: string } {
  const w = alerts.filter((a) => a.status === 'warning').length
  const c = alerts.filter((a) => a.status === 'caution').length
  if (w + c === 0) return { text: 'All good today. Nothing needs your attention.', tone: 'text-nominal' }
  const parts = []
  if (w) parts.push(`${w} ${w === 1 ? 'thing needs' : 'things need'} action`)
  if (c) parts.push(`${c} to keep an eye on`)
  return { text: `${parts.join(', ')}.`, tone: w ? 'text-warning' : 'text-caution' }
}

/**
 * "What do I do now?" — one plain-language headline and a short numbered plan.
 * Only the current step is expanded; finished steps collapse to a check mark.
 */
export function GuidePanel({ env, alerts, priorities, reviewed, onShow, onOpenProcedure, onCheckIn }: Props) {
  const e = ENVIRONMENTS[env]
  const { messages } = useComms()
  const [envOpen, setEnvOpen] = useState(false)
  const [routineDone, setRoutineDone] = useState<Record<string, boolean>>({})
  const [shelterAck, setShelterAck] = useState<string | null>(null)
  const sw = useSpaceWeather().assess(env)
  const radiation = sw.level !== 'nominal' && sw.action ? sw : null
  const radKey = `${env}:${sw.lastSep?.id ?? sw.title}`
  const base = headline(alerts)
  const h =
    radiation?.level === 'warning' && shelterAck !== radKey
      ? { text: 'Radiation alert — get to shelter first.', tone: 'text-warning' }
      : base

  const steps: Step[] = [
    ...(radiation
      ? [
          {
            key: 'radiation',
            title: `Radiation: ${radiation.title.toLowerCase()}`,
            detail: `${radiation.action} (Source: NASA DONKI.)`,
            done: shelterAck === radKey,
            color: STATUS_HEX[radiation.level],
            action: { label: 'Done — I’m sheltered', run: () => setShelterAck(radKey) },
          },
        ]
      : []),
    {
      key: 'checkin',
      title: 'Morning check-in',
      detail: 'Logged today. Your readings are compared with your own normal.',
      done: true,
      action: { label: 'Do another check-in', run: onCheckIn },
    },
    ...alerts.map((a) => ({
      key: a.id,
      title: `Look at: ${a.label}${priorities.has(a.id) ? ' ◈' : ''}`,
      detail: a.trend,
      done: reviewed.has(a.id),
      color: STATUS_HEX[a.status],
      action: { label: 'Show me', run: () => onShow(a.id) },
    })),
  ]

  const worst = alerts[0]
  if (worst && worst.status === 'warning') {
    const sent = messages.some((m) => m.env === env)
    steps.push({
      key: 'escalate',
      title: e.escalation.mode === 'queued' ? 'Decide whether to contact Earth' : `Decide whether to call ${e.escalation.mode === 'radio' ? 'the base medic' : 'the flight surgeon'}`,
      detail:
        e.escalation.mode === 'queued'
          ? `Earth is ${formatDelay(e.oneWayDelaySec)} away each way. Follow the procedure with your crew first; send a consult only if the escalation conditions apply.`
          : `${e.escalation.firstContact} is reachable now. Call if the escalation conditions in the procedure apply.`,
      done: sent,
      action: { label: 'Open procedure', run: () => onOpenProcedure(worst.id) },
    })
  }

  steps.push({
    key: 'routine',
    title: `Today’s routine · ${e.kind.toLowerCase()}`,
    detail: 'Tick these off as you go.',
    done: e.checklist.every((c) => routineDone[`${env}:${c}`]),
    extra: (
      <ul className="mt-2 space-y-1">
        {e.checklist.map((c) => {
          const k = `${env}:${c}`
          return (
            <li key={k}>
              <button
                onClick={() => setRoutineDone((r) => ({ ...r, [k]: !r[k] }))}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] hover:bg-white/5"
                aria-pressed={!!routineDone[k]}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${routineDone[k] ? 'border-nominal bg-nominal/20 text-nominal' : 'border-white/20'}`}>
                  {routineDone[k] ? '✓' : ''}
                </span>
                <span className={routineDone[k] ? 'text-ink-dim line-through' : ''}>{c}</span>
              </button>
            </li>
          )
        })}
      </ul>
    ),
  })

  const current = steps.findIndex((s) => !s.done)
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-3">
      <section className="glass pointer-events-auto p-4" data-tour="guide">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Today</div>
        <p className={`mt-1 text-lg font-bold leading-snug ${h.tone}`}>{h.text}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
            <div className="h-full rounded bg-accent transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <span className="font-mono text-[10px] text-ink-dim">
            {doneCount}/{steps.length}
          </span>
        </div>

        <ol className="mt-3 space-y-1">
          {steps.map((s, i) => {
            const isCurrent = i === current
            return (
              <li key={s.key} className={`rounded-xl transition-colors ${isCurrent ? 'bg-white/[0.05] p-3' : 'px-3 py-1.5'}`}>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                      s.done ? 'bg-nominal/20 text-nominal' : isCurrent ? 'bg-accent text-space-950' : 'border border-white/15 text-ink-dim'
                    }`}
                  >
                    {s.done ? '✓' : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold leading-snug ${s.done ? 'text-ink-dim' : isCurrent ? '' : 'text-ink-dim'}`}>
                      {s.color && !s.done && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: s.color }} />}
                      {s.title}
                    </div>
                    <AnimatePresence initial={false}>
                      {isCurrent && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <p className="mt-1 text-[13px] leading-snug text-ink/85">{s.detail}</p>
                          {s.extra}
                          {s.action && (
                            <button onClick={s.action.run} className="hud-btn mt-2 w-full bg-accent font-bold text-space-950">
                              {s.action.label} ›
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {!isCurrent && s.action && !s.done && (
                    <button onClick={s.action.run} className="min-h-9 shrink-0 rounded-lg px-2 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-white/5">
                      {s.action.label}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {current === -1 && <p className="mt-2 text-sm text-nominal">All steps done for today. Nice work.</p>}
      </section>

      <SpaceWeatherCard env={env} />

      {/* Environment folded to one line; expand for what's different here */}
      <section className="glass pointer-events-auto p-3" data-tour="env">
        <button onClick={() => setEnvOpen((o) => !o)} className="flex min-h-11 w-full items-center gap-3 text-left" aria-expanded={envOpen}>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{e.kind}</div>
            <div className="truncate text-[13px] text-ink-dim">
              {e.gravity} · Earth {e.groundAvailable === 'delayed' ? `${formatDelay(e.oneWayDelaySec)} away` : 'live'} · ~{e.doseMsvPerDay} mSv/day
            </div>
          </div>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-dim">{envOpen ? 'Hide ▴' : 'What’s different here ▾'}</span>
        </button>
      </section>
      <AnimatePresence initial={false}>
        {envOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <EnvironmentCard env={env} onSystem={onShow} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
