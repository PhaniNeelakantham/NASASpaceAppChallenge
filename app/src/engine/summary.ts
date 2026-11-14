import { METRICS } from '../content/metrics'
import { SYSTEMS } from '../content/systems'
import type { Finding } from '../types'

/**
 * Template-based daily summary (DESIGN.md §6b, item 1).
 * Deterministic and offline: every sentence comes from a structured finding,
 * so nothing is invented.
 */
export function dailySummary(findings: Finding[], firstName: string): string[] {
  const flagged = findings
    .filter((f) => f.status !== 'nominal')
    .sort((a, b) => (a.status === b.status ? Math.abs(b.z) - Math.abs(a.z) : a.status === 'warning' ? -1 : 1))

  if (flagged.length === 0) {
    return [`All tracked indicators are within your normal range, ${firstName}. Keep up the routine.`]
  }

  return flagged.slice(0, 3).map((f) => {
    const def = METRICS[f.metric]
    const sys = SYSTEMS[f.system]
    const pct = f.baselineMean !== 0 ? Math.round(((f.value - f.baselineMean) / f.baselineMean) * 100) : 0
    const dir = pct >= 0 ? 'above' : 'below'
    const amount = def.unit === '°C' ? `${Math.abs(f.value - f.baselineMean).toFixed(1)} °C` : `${Math.abs(pct)}%`
    const streak = f.streak > 1 ? ` for ${f.streak} days` : ''
    return `${def.label} is ${amount} ${dir} your normal${streak} (${f.value} ${def.unit}). Linked to: ${sys.hrpRisk}. Next: ${sys.actions[0]}.`
  })
}
