import { ToneIcon } from '../../../components/ToneIcon'
import { X } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { relTime } from '../../../state/crewStore'
import { PAIN_KINDS, REGIONS, needsEscalation, regionLabel, severityColor, type PainKind, type RegionId, type Side } from './painContent'
import type { PainSpot } from './PainLayer'

const btn = 'min-h-11 rounded-lg px-4 text-sm font-semibold'

function Guidance({ region, severity, onEmergency }: { region: RegionId; severity: number; onEmergency: () => void }) {
  const info = REGIONS[region]
  const escalate = needsEscalation({ region, severity })
  return (
    <div className="flex flex-col gap-2 text-sm">
      {escalate && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-warning">
          <b><ToneIcon tone="warning" /> This needs a doctor now.</b> Pain this strong{region === 'chest' ? ' in the chest' : ''} should go to the Crew Medical Officer or flight surgeon.
          <button onClick={onEmergency} className={`${btn} mt-2 w-full bg-warning text-space-950`}>
            Start Emergency guide
          </button>
        </div>
      )}
      <p className="text-ink-dim">{info.inSpace}</p>
      <div>
        <div className="section-h">Try first</div>
        <ul className="list-inside list-disc text-sm">
          {info.selfCare.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <p className="rounded-lg bg-caution/10 p-2 text-xs text-caution"><ToneIcon tone="caution" /> Get help if: {info.redFlags}</p>
    </div>
  )
}

export function PainForm({
  region,
  side,
  severity,
  onSeverity,
  onSave,
  onCancel,
  onEmergency,
}: {
  region: RegionId
  side?: Side
  severity: number
  onSeverity: (n: number) => void
  onSave: (kind: PainKind, note: string) => void
  onCancel: () => void
  onEmergency: () => void
}) {
  const [kind, setKind] = useState<PainKind>('Dull / aching')
  const [note, setNote] = useState('')
  const color = severityColor(severity)
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass flex max-h-[calc(100vh-290px)] w-[340px] flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]">
      <div className="flex items-center justify-between">
        <span className="section-h !mb-0">Report pain · {regionLabel(region, side)}</span>
        <button onClick={onCancel} className="font-mono text-xs uppercase text-ink-dim hover:text-ink" aria-label="Cancel">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm">How bad is it?</span>
          <span className="font-mono text-2xl font-black" style={{ color }}>
            {severity}/10
          </span>
        </div>
        <input type="range" min={1} max={10} value={severity} onChange={(e) => onSeverity(Number(e.target.value))} className="h-10 w-full" style={{ accentColor: color }} aria-label="Pain severity" />
        <div className="flex justify-between font-mono text-[10px] text-ink-dim">
          <span>Mild</span>
          <span>Moderate</span>
          <span>Worst</span>
        </div>
      </div>
      <div>
        <div className="mb-1 text-sm">What does it feel like?</div>
        <div className="flex flex-wrap gap-1.5">
          {PAIN_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`min-h-9 rounded-full border px-3 text-xs ${kind === k ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-ink-dim hover:text-ink'}`}
              aria-pressed={kind === k}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional): when did it start?"
        className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-accent/60"
      />
      <Guidance region={region} severity={severity} onEmergency={onEmergency} />
      <button onClick={() => onSave(kind, note)} className={`${btn} bg-accent text-space-950`}>
        Save to pain map
      </button>
    </motion.div>
  )
}

export function PainSpotCard({
  spot,
  onLogAgain,
  onResolve,
  onClose,
  onEmergency,
}: {
  spot: PainSpot
  onLogAgain: () => void
  onResolve: () => void
  onClose: () => void
  onEmergency: () => void
}) {
  const h = spot.history
  const first = h[0]
  const last = spot.latest
  const delta = last.severity - first.severity
  const trend = h.length < 2 ? null : delta < 0 ? { tone: 'nominal' as const, t: `Easing: ${first.severity} → ${last.severity}`, c: 'text-nominal' } : delta > 0 ? { tone: 'warning' as const, t: `Getting worse: ${first.severity} → ${last.severity}`, c: 'text-warning' } : { tone: 'caution' as const, t: `No change: ${last.severity}/10`, c: 'text-caution' }
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass flex max-h-[calc(100vh-290px)] w-[340px] flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]">
      <div className="flex items-center justify-between">
        <span className="section-h !mb-0">Pain · {regionLabel(last.region, last.side)}</span>
        <button onClick={onClose} className="font-mono text-xs uppercase text-ink-dim hover:text-ink" aria-label="Close">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      {trend && <div className={`font-mono text-sm font-semibold ${trend.c}`}><ToneIcon tone={trend.tone} /> {trend.t}</div>}
      {trend && delta > 0 && <p className="text-xs text-warning">Pain that keeps getting worse should be reported, even if it is mild.</p>}
      <div className="flex h-16 items-end gap-1" aria-label="Pain history">
        {h.map((r) => (
          <div key={r.id} className="flex max-w-12 flex-1 flex-col items-center gap-1" title={`${r.severity}/10 · ${r.kind}${r.note ? ` · ${r.note}` : ''}`}>
            <div className="w-full rounded-t" style={{ height: `${r.severity * 5}px`, background: severityColor(r.severity) }} />
            <span className="font-mono text-[9px] text-ink-dim">{relTime(r.at).replace(' ago', '')}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-dim">
        Last: {last.kind.toLowerCase()}, {relTime(last.at)}
        {last.note && <> · “{last.note}”</>}
      </p>
      <Guidance region={last.region} severity={last.severity} onEmergency={onEmergency} />
      <div className="flex gap-2">
        <button onClick={onResolve} className={`${btn} flex-1 bg-space-800`}>
          It’s gone
        </button>
        <button onClick={onLogAgain} className={`${btn} flex-[2] bg-accent text-space-950`}>
          Log today’s level
        </button>
      </div>
    </motion.div>
  )
}
