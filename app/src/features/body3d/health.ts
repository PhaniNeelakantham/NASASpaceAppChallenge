import { METRICS } from '../../content/metrics'
import { SYSTEM_LIST, SYSTEMS } from '../../content/systems'
import type { Finding, Reading, Status, SystemId } from '../../types'

export interface Indicator {
  label: string
  status: Status
  value?: string
}

/** Everything the 3D view needs to know about one body system. */
export interface SystemView {
  id: SystemId
  label: string
  status: Status
  primary?: Finding
  findings: Finding[]
  indicators: Indicator[]
  /** One-sentence trend for the HUD card. */
  trend: string
}

const RANK: Record<Status, number> = { warning: 3, caution: 2, nominal: 1, nodata: 0 }

function direction(readings: Reading[], f: Finding): 'rising' | 'falling' | 'steady' {
  const prev = readings
    .slice(-4, -1)
    .map((r) => r.values[f.metric])
    .filter((v): v is number => v !== undefined)
  if (prev.length === 0) return 'steady'
  const mean = prev.reduce((a, b) => a + b, 0) / prev.length
  const rel = mean === 0 ? 0 : (f.value - mean) / Math.abs(mean)
  if (rel > 0.03) return 'rising'
  if (rel < -0.03) return 'falling'
  return 'steady'
}

/** "1.8 °C above" for temperatures (percent is meaningless there), "22% above" otherwise. */
export function deviationText(f: Finding, pct: number): string {
  const def = METRICS[f.metric]
  const delta = f.value - f.baselineMean
  const side = delta >= 0 ? 'above' : 'below'
  if (def.unit === '°C') return `${Math.abs(delta).toFixed(1)} °C ${side}`
  return `${Math.abs(pct)}% ${side}`
}

function trendSentence(id: SystemId, readings: Reading[], primary: Finding | undefined, symptoms: string[]): string {
  if (primary) {
    const pct = primary.baselineMean === 0 ? 0 : Math.round(((primary.value - primary.baselineMean) / primary.baselineMean) * 100)
    const dir = direction(readings, primary)
    if (primary.status === 'nominal') {
      return dir === 'steady' ? 'Within your normal range and holding steady.' : `Within your normal range, ${dir} slightly.`
    }
    const streak = primary.streak > 1 ? ` for ${primary.streak} days` : ' today'
    const tail = dir === 'steady' ? 'holding there.' : `still ${dir}.`
    return `${deviationText(primary, pct)} your normal${streak} — ${tail}`
  }
  if (id === 'skin') {
    return symptoms.includes('rash')
      ? 'Rash reported today — photograph it and watch for spreading.'
      : 'No rash, bruising or pressure marks reported.'
  }
  if (id === 'eyes') {
    return symptoms.includes('headache')
      ? 'Headache logged — run the vision grid test today.'
      : 'No vision test logged today — the grid test takes 1 minute.'
  }
  return 'No measurement logged yet today.'
}

export function buildSystemViews(
  readings: Reading[],
  findings: Finding[],
  statuses: Record<SystemId, Status>,
): Record<SystemId, SystemView> {
  const symptoms = readings.at(-1)?.symptoms ?? []
  const out = {} as Record<SystemId, SystemView>
  for (const sys of SYSTEM_LIST) {
    const mine = findings
      .filter((f) => f.system === sys.id)
      .sort((a, b) => RANK[b.status] - RANK[a.status] || Math.abs(b.z) - Math.abs(a.z))
    const primary = mine[0]
    const indicators: Indicator[] = [
      ...mine.map((f) => ({
        label: METRICS[f.metric].label,
        status: f.status as Status,
        value: `${f.value} ${METRICS[f.metric].unit}`.trim(),
      })),
      ...SYSTEMS[sys.id].extraIndicators.map((label) => {
        let status: Status = 'nodata'
        if (label === 'Rash check') status = symptoms.includes('rash') ? 'caution' : 'nominal'
        if (label === 'Headache log') status = symptoms.includes('headache') ? 'caution' : 'nominal'
        if (label === 'Symptom log') status = symptoms.length > 0 ? 'caution' : 'nominal'
        return { label, status }
      }),
    ]
    out[sys.id] = {
      id: sys.id,
      label: sys.label,
      status: statuses[sys.id],
      primary,
      findings: mine,
      indicators,
      trend: trendSentence(sys.id, readings, primary, symptoms),
    }
  }
  return out
}
