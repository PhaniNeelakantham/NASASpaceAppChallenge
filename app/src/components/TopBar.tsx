import { CREW, CURRENT_DAY } from '../data/syntheticCrew'
import { useComms } from '../state/comms'
import { ENVIRONMENT_LIST, ENVIRONMENTS, formatCountdown, formatDelay, type EnvironmentId } from '../state/mission'

interface Props {
  env: EnvironmentId
  onEnv: (e: EnvironmentId) => void
  crewId: string
  onCrew: (id: string) => void
  night: boolean
  onNight: () => void
  onEmergency: () => void
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-dim">{label}</span>
      <span className={`font-mono text-sm font-semibold ${tone ?? ''}`}>{value}</span>
    </div>
  )
}

const select =
  'min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-xs uppercase tracking-wider text-ink outline-none hover:bg-white/[0.07] focus:border-accent/60'

/** Messages to Earth / base that are still travelling or waiting for a reply. */
function CommsChip() {
  const { pending, now, phase } = useComms()
  if (pending.length === 0) return null
  const next = [...pending].sort((a, b) => a.replyAt - b.replyAt)[0]
  const p = phase(next)
  const label = p === 'transit' ? 'Message in transit' : 'Awaiting reply'
  const ms = p === 'transit' ? next.arriveAt - now : next.replyAt - now
  return (
    <div className="flex items-center gap-2 rounded-xl border border-caution/40 bg-caution/10 px-3 py-1.5" title={`To: ${next.to}`}>
      <span className="text-caution">▲</span>
      <Stat label={`${label}${pending.length > 1 ? ` · ${pending.length}` : ''}`} value={formatCountdown(ms)} tone="text-caution" />
    </div>
  )
}

export function TopBar({ env, onEnv, crewId, onCrew, night, onNight, onEmergency }: Props) {
  const e = ENVIRONMENTS[env]
  const delayed = e.groundAvailable === 'delayed'
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/5 bg-space-950 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="relative grid h-8 w-8 place-items-center">
          <span className="absolute inset-0 rounded-full border border-accent/50" />
          <span className="absolute inset-1.5 rounded-full border border-accent/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-lg font-bold tracking-[0.35em] text-accent">HALO</span>
      </div>

      <label className="flex flex-col leading-tight">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-dim">Environment</span>
        <select value={env} onChange={(ev) => onEnv(ev.target.value as EnvironmentId)} className={select} aria-label="Mission environment">
          {ENVIRONMENT_LIST.map((x) => (
            <option key={x.id} value={x.id} className="bg-space-900">
              {x.kind} — {x.label}
            </option>
          ))}
        </select>
      </label>

      <Stat label="Mission day" value={String(CURRENT_DAY)} />
      <Stat label="Gravity" value={e.gravity} />
      <div title={e.note}>
        <Stat
          label="Earth link · one-way"
          value={delayed ? `▲ ${formatDelay(e.oneWayDelaySec)}` : `● ${formatDelay(e.oneWayDelaySec)}`}
          tone={delayed ? 'text-caution' : 'text-nominal'}
        />
      </div>
      <CommsChip />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onEmergency}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-warning px-5 font-mono text-sm font-black uppercase tracking-[0.15em] text-space-950 shadow-[0_0_0_3px_rgba(255,90,78,0.25)] hover:brightness-110"
          aria-label="Emergency — start guided first response"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-space-950 text-warning">!</span>
          Emergency
        </button>
        <button onClick={onNight} className={select} aria-pressed={night}>
          {night ? '☀ Day' : '☾ Night'}
        </button>
        <select value={crewId} onChange={(ev) => onCrew(ev.target.value)} className={select} aria-label="Crew member">
          {CREW.map((c) => (
            <option key={c.id} value={c.id} className="bg-space-900">
              {c.name} — {c.role}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
