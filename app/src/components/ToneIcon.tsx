import { CircleCheck, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'

export type Tone = 'nominal' | 'caution' | 'warning' | 'nodata'

// Each status has its own shape as well as its colour (colorblind-safe).
export const TONE_ICON: Record<Tone, LucideIcon> = {
  nominal: CircleCheck,
  caution: TriangleAlert,
  warning: OctagonAlert,
  nodata: CircleDashed,
}

/** Inline status icon that sits on the text baseline. */
export function ToneIcon({ tone, className = '' }: { tone: Tone; className?: string }) {
  const I = TONE_ICON[tone]
  return <I aria-hidden className={`inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.2em] ${className}`} />
}

/** Any Lucide icon sized to sit inline with text. */
export const inl = 'inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.2em]'
