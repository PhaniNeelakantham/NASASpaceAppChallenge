import { Circle } from 'lucide-react'
/** Data provenance: every number says whether it is real NASA data or simulated. */
export function SourceBadge({ kind, label }: { kind: 'nasa' | 'sim' | 'published'; label?: string }) {
  const style =
    kind === 'nasa'
      ? 'border-[#5eead4]/50 bg-[#5eead4]/10 text-[#5eead4]'
      : kind === 'published'
        ? 'border-white/20 bg-white/5 text-ink-dim'
        : 'border-white/15 bg-transparent text-ink-dim'
  const text = label ?? (kind === 'nasa' ? 'NASA data' : kind === 'published' ? 'Published values' : 'Simulated')
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${style}`}>
      <Circle aria-hidden className="h-2 w-2" fill={kind === 'nasa' ? 'currentColor' : 'none'} /> {text}
    </span>
  )
}
