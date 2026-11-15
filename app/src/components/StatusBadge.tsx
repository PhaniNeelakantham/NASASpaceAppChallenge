import { ToneIcon } from './ToneIcon'
import type { ReactNode } from 'react'
import type { Status } from '../types'

// Status = color + shape + word, never color alone (colorblind-safe).
export const STATUS_META: Record<Status, { shape: ReactNode; word: string; text: string; bg: string; ring: string }> = {
  nominal: { shape: <ToneIcon tone="nominal" />, word: 'Nominal', text: 'text-nominal', bg: 'bg-nominal', ring: 'ring-nominal' },
  caution: { shape: <ToneIcon tone="caution" />, word: 'Caution', text: 'text-caution', bg: 'bg-caution', ring: 'ring-caution' },
  warning: { shape: <ToneIcon tone="warning" />, word: 'Warning', text: 'text-warning', bg: 'bg-warning', ring: 'ring-warning' },
  nodata: { shape: <ToneIcon tone="nodata" />, word: 'No data', text: 'text-ink-dim', bg: 'bg-ink-dim', ring: 'ring-ink-dim' },
}

export function StatusBadge({ status, compact = false }: { status: Status; compact?: boolean }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${m.text}`}>
      <span aria-hidden>{m.shape}</span>
      {!compact && <span className="text-xs uppercase tracking-wide">{m.word}</span>}
      {compact && <span className="sr-only">{m.word}</span>}
    </span>
  )
}
