import { motion } from 'framer-motion'
import { SourceBadge } from '../../../components/SourceBadge'
import { StatusBadge } from '../../../components/StatusBadge'
import { METRICS } from '../../../content/metrics'
import type { SystemView } from '../health'
import { STATUS_HEX } from '../theme'

interface Props {
  view: SystemView
  insight?: string
  envKind: string
  priority: boolean
  onExpand: () => void
  onClose: () => void
}

/** First tap: compact HUD — status, primary metric, one-sentence trend. No data walls. */
export function HudCard({ view, insight, envKind, priority, onExpand, onClose }: Props) {
  const p = view.primary
  const def = p ? METRICS[p.metric] : null
  const arrow = p ? (p.z > 0.5 ? '▲' : p.z < -0.5 ? '▼' : '■') : ''
  const color = STATUS_HEX[view.status]
  return (
    <motion.div
      initial={{ opacity: 0, x: -12, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="hud-card pointer-events-auto"
      style={{ ['--node' as string]: color }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">System</div>
          <div className="text-base font-bold leading-tight">{view.label}</div>
        </div>
        <StatusBadge status={view.status} />
      </div>

      {p && def ? (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-black tabular-nums" style={{ color: view.status === 'nominal' ? undefined : color }}>
            {p.value}
          </span>
          <span className="text-sm text-ink-dim">{def.unit}</span>
          <span className="text-sm" style={{ color }}>
            {arrow}
          </span>
          <span className="ml-auto text-right text-[11px] leading-tight text-ink-dim">
            {def.label}
            <br />
            normal ≈ {p.baselineMean.toFixed(1)}
          </span>
        </div>
      ) : null}

      <p className="mt-2 text-sm leading-snug">{view.trend}</p>
      {p && (
        <div className="mt-1.5">
          <SourceBadge kind="sim" />
        </div>
      )}

      {insight && (
        <div className="mt-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-2.5 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
            {priority ? '◈ Priority · ' : ''}
            {envKind}
          </div>
          <p className="text-[12px] leading-snug">{insight}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={onExpand} className="hud-btn flex-[2] font-bold" style={{ background: color, color: '#04070f' }}>
          Full details ›
        </button>
        <button onClick={onClose} className="hud-btn flex-1 border border-white/15 text-ink-dim" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="mt-2 text-center font-mono text-[10px] text-ink-dim">tap the node again to expand</div>
    </motion.div>
  )
}
