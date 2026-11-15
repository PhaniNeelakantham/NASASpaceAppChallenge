import { inl } from '../../../components/ToneIcon'
import { Flag, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatusBadge } from '../../../components/StatusBadge'
import { METRICS } from '../../../content/metrics'
import { SYSTEMS } from '../../../content/systems'
import { computeBaseline } from '../../../engine/baseline'
import { ENVIRONMENTS, type EnvironmentId } from '../../../state/mission'
import type { MetricId, Reading } from '../../../types'
import type { SystemView } from '../health'
import { STATUS_HEX } from '../theme'
import { EscalationPanel } from './EscalationPanel'
import { RealCrewChart } from './RealCrewChart'
import { SourceBadge } from '../../../components/SourceBadge'

interface Props {
  view: SystemView
  readings: Reading[]
  env: EnvironmentId
  onClose: () => void
}

function MetricChart({ metric, readings, color }: { metric: MetricId; readings: Reading[]; color: string }) {
  const def = METRICS[metric]
  const b = computeBaseline(readings, metric)
  const data = readings.map((r) => ({
    day: r.missionDay,
    value: r.values[metric],
    band: b ? [b.mean - 2 * b.sd, b.mean + 2 * b.sd] : undefined,
  }))
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{def.label}</span>
        <span className="font-mono text-[10px] text-ink-dim">{def.unit} · last 30 days</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
            <Tooltip isAnimationActive={false} contentStyle={{ background: '#0b1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
            <Area dataKey="band" stroke="none" fill="#2dd4bf" fillOpacity={0.1} isAnimationActive={false} />
            {def.warnHigh !== undefined && <ReferenceLine y={def.warnHigh} stroke="#ff5a4e" strokeDasharray="3 3" />}
            {def.warnLow !== undefined && <ReferenceLine y={def.warnLow} stroke="#ff5a4e" strokeDasharray="3 3" />}
            <Line dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Second tap: full history, imaging and procedures. */
export function DetailPanel({ view, readings, env, onClose }: Props) {
  const s = SYSTEMS[view.id]
  const e = ENVIRONMENTS[env]
  const color = STATUS_HEX[view.status]
  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="glass absolute bottom-3 right-3 top-3 z-40 flex w-[min(440px,calc(100%-24px))] flex-col overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${color}40, 0 20px 60px -20px ${color}55` }}
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">{s.hrpRisk}</div>
          <h2 className="text-xl font-bold">{s.label}</h2>
          <div className="mt-1">
            <StatusBadge status={view.status} />
          </div>
        </div>
        <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 text-lg hover:bg-white/5" aria-label="Close details">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <p className="text-sm leading-snug">{view.trend}</p>

        <section className="rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
          <h3 className="section-h !text-accent">
            {e.priorities.includes(view.id) ? <><Flag className={inl} /> Priority risk · </> : ''}In this environment · {e.kind}
          </h3>
          <p className="text-sm">{e.insights[view.id] ?? 'No environment-specific change for this system.'}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] leading-snug text-ink-dim">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em]">Medical on hand</div>
              {e.medical.join(' · ')}
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em]">Exercise</div>
              {e.exercise}
            </div>
          </div>
        </section>

        {view.findings.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="section-h !mb-0">Your history</h3>
              <SourceBadge kind="sim" label="Simulated crew data" />
            </div>
            {view.findings.map((f) => (
              <MetricChart key={f.metric} metric={f.metric} readings={readings} color={f.status === 'nominal' ? '#7dd3fc' : STATUS_HEX[f.status]} />
            ))}
          </section>
        )}

        {view.id === 'immune' && <RealCrewChart />}

        <section>
          <h3 className="section-h">Tracked indicators</h3>
          <ul className="grid grid-cols-2 gap-2">
            {view.indicators.map((i) => (
              <li key={i.label} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_HEX[i.status], boxShadow: `0 0 8px ${STATUS_HEX[i.status]}` }} />
                <span className="flex-1">{i.label}</span>
                {i.value && <span className="font-mono text-ink-dim">{i.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        {s.imaging && (
          <section>
            <h3 className="section-h">Imaging</h3>
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 p-3">
              <svg viewBox="0 0 100 70" className="h-20 w-28 shrink-0">
                <defs>
                  <radialGradient id="us" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path d="M50 2 L95 60 A60 60 0 0 1 5 60 Z" fill="url(#us)" stroke="#7dd3fc" strokeOpacity="0.4" />
                {[20, 35, 50].map((r) => (
                  <path key={r} d={`M${50 - r * 0.75} ${2 + r} A${r} ${r} 0 0 0 ${50 + r * 0.75} ${2 + r}`} fill="none" stroke="#7dd3fc" strokeOpacity="0.15" />
                ))}
              </svg>
              <div className="text-sm">
                <div className="font-semibold">{s.imaging}</div>
                <div className="text-xs text-ink-dim">No scan on record. Guided capture walks a non-specialist through probe placement.</div>
                <button className="hud-btn mt-2 border border-white/10 px-4 text-xs">Start guided scan</button>
              </div>
            </div>
          </section>
        )}

        <section>
          <h3 className="section-h">Why in space</h3>
          <p className="text-sm text-ink/90">{s.whyInSpace}</p>
        </section>

        <section>
          <h3 className="section-h">Procedure: do now</h3>
          <ol className="space-y-2">
            {s.actions.map((a, i) => (
              <li key={a} className="flex gap-3 rounded-lg bg-white/[0.03] p-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-xs" style={{ background: `${color}25`, color }}>
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </section>

        <EscalationPanel view={view} env={env} color={color} />

        <a href={s.source.url} target="_blank" rel="noreferrer" className="block text-xs text-accent underline">
          Source: {s.source.label}
        </a>
      </div>
    </motion.aside>
  )
}
