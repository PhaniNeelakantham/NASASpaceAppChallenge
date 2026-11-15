import { inl } from '../../../components/ToneIcon'
import { Circle, Flag } from 'lucide-react'
import { SourceBadge } from '../../../components/SourceBadge'
import { SYSTEMS } from '../../../content/systems'
import { ENVIRONMENTS, formatDelay, type EnvironmentId } from '../../../state/mission'
import type { SystemId } from '../../../types'

const CAREER_LIMIT = 600 // mSv, NASA career effective-dose limit

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim">{label}</div>
      <div className={`text-[13px] font-semibold leading-tight ${tone ?? ''}`}>{value}</div>
    </div>
  )
}

/** What changes for the astronaut's health in the current environment. */
export function EnvironmentCard({ env, onSystem }: { env: EnvironmentId; onSystem: (id: SystemId) => void }) {
  const e = ENVIRONMENTS[env]
  const delayed = e.groundAvailable === 'delayed'
  const daysToLimit = Math.round(CAREER_LIMIT / e.doseMsvPerDay)
  return (
    <section className="glass pointer-events-auto p-3" aria-label="Current environment">
      <div className="flex items-start justify-between gap-2 px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{e.kind}</div>
          <div className="text-[13px] leading-snug text-ink-dim">{e.location}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Fact label="Gravity" value={e.gravity} />
        <Fact label="Earth link" value={delayed ? `${formatDelay(e.oneWayDelaySec)} one-way` : 'Live'} tone={delayed ? 'text-caution' : 'text-nominal'} />
        <Fact label="Evacuation" value={e.evacuation} tone={e.evacuation.startsWith('Not') ? 'text-caution' : undefined} />
        <Fact label="Radiation" value={`~${e.doseMsvPerDay} mSv/day`} tone={e.doseMsvPerDay >= 1.4 ? 'text-caution' : undefined} />
      </div>
      <div className="mt-1.5 px-1">
        <SourceBadge kind="published" label="Published dose measurements" />
      </div>
      <p className="mt-1 px-1 text-[11px] leading-tight text-ink-dim">
        {e.doseNote}. At this rate the 600 mSv career limit is ~{daysToLimit} days away.
      </p>

      <div className="mt-3 px-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Priority risks here</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {e.priorities.map((id) => (
            <button
              key={id}
              onClick={() => onSystem(id)}
              className="min-h-10 rounded-lg border border-accent/40 bg-accent/10 px-3 text-xs font-semibold text-accent hover:bg-accent/20"
            >
              <Flag className={inl} /> {SYSTEMS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 px-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Routine for this environment</div>
        <ul className="mt-1 space-y-1 text-[13px]">
          {e.checklist.map((c) => (
            <li key={c} className="flex gap-2">
              <Circle aria-hidden className="mt-1.5 h-2 w-2 shrink-0 text-ink-dim" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-1 text-[11px] leading-snug">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim">Medical on hand</div>
          {e.medical.join(' · ')}
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim">Exercise</div>
          {e.exercise}
        </div>
      </div>
    </section>
  )
}
