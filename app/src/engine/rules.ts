import { METRIC_LIST } from '../content/metrics'
import type { Finding, MetricDef, Reading, Status, SystemId } from '../types'
import { computeBaseline, zScore, type Baseline } from './baseline'

const RANK: Record<Status, number> = { nodata: -1, nominal: 0, caution: 1, warning: 2 }

export function worst(a: Status, b: Status): Status {
  return RANK[a] >= RANK[b] ? a : b
}

function badZ(def: MetricDef, z: number): number {
  if (def.badDirection === 'high') return z
  if (def.badDirection === 'low') return -z
  return Math.abs(z)
}

function streakOf(readings: Reading[], def: MetricDef, b: Baseline): number {
  let n = 0
  for (let i = readings.length - 1; i >= 0; i--) {
    const v = readings[i].values[def.id]
    if (v === undefined || badZ(def, zScore(v, b)) < def.zCaution) break
    n++
  }
  return n
}

/** Evaluates the latest reading for one crew member. Pure function — unit-test this. */
export function evaluate(readings: Reading[]): Finding[] {
  const latest = readings.at(-1)
  if (!latest) return []
  const findings: Finding[] = []
  for (const def of METRIC_LIST) {
    const value = latest.values[def.id]
    const b = computeBaseline(readings, def.id)
    if (value === undefined || !b) continue
    const z = zScore(value, b)
    const dz = badZ(def, z)
    const streak = streakOf(readings, def, b)
    const outOfLimits =
      (def.warnHigh !== undefined && value >= def.warnHigh) || (def.warnLow !== undefined && value <= def.warnLow)

    let status: Finding['status'] = 'nominal'
    let reason = 'Within your personal normal range.'
    if (outOfLimits) {
      status = 'warning'
      reason = `Outside the safety limit (${def.warnLow ?? '–'}–${def.warnHigh ?? '–'} ${def.unit}).`
    } else if (dz >= def.zWarning || (dz >= def.zCaution && streak >= 3)) {
      status = 'warning'
      reason = streak >= 3 ? `Away from your normal for ${streak} days in a row.` : 'Far from your personal normal.'
    } else if (dz >= def.zCaution) {
      status = 'caution'
      reason = 'Noticeably different from your personal normal.'
    }
    findings.push({ metric: def.id, system: def.system, status, value, baselineMean: b.mean, z, streak, reason })
  }
  return findings
}

export function systemStatus(findings: Finding[], symptoms: string[] = []): Record<SystemId, Status> {
  const out = {
    skin: symptoms.includes('rash') ? 'caution' : 'nominal',
    heart: 'nodata', lungs: 'nodata', eyes: 'nodata', bones: 'nodata', muscle: 'nodata',
    immune: 'nodata', gut: 'nodata', mind: 'nodata', sleep: 'nodata',
  } as Record<SystemId, Status>
  for (const f of findings) out[f.system] = worst(out[f.system], f.status)
  if (symptoms.includes('vision change')) out.eyes = worst(out.eyes, 'caution')
  return out
}
