import { inl, ToneIcon } from '../../components/ToneIcon'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { STATUS_META, StatusBadge } from '../../components/StatusBadge'
import { METRIC_LIST, METRICS } from '../../content/metrics'
import { computeBaseline, zScore, type Baseline } from '../../engine/baseline'
import { evaluate } from '../../engine/rules'
import type { MetricDef, MetricId, Reading, Status } from '../../types'

interface Point {
  day: number
  value?: number
  band?: [number, number]
  status: Status
}

// Same "which direction is bad" logic as engine/rules.ts.
function badZ(def: MetricDef, z: number): number {
  if (def.badDirection === 'high') return z
  if (def.badDirection === 'low') return -z
  return Math.abs(z)
}

function pointStatus(def: MetricDef, b: Baseline | null, v?: number): Status {
  if (v === undefined) return 'nodata'
  const outOfLimits = (def.warnHigh !== undefined && v >= def.warnHigh) || (def.warnLow !== undefined && v <= def.warnLow)
  if (outOfLimits) return 'warning'
  if (!b) return 'nominal'
  const dz = badZ(def, zScore(v, b))
  if (dz >= def.zWarning) return 'warning'
  if (dz >= def.zCaution) return 'caution'
  return 'nominal'
}

const fmt = (n: number, d = 1) => Number(n.toFixed(d)).toString()

/** Status = color + shape: circle (normal), triangle (caution), diamond (warning). */
function StatusDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Point }) {
  if (cx === undefined || cy === undefined || !payload || payload.value === undefined) return <g />
  if (payload.status === 'warning')
    return <polygon points={`${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}`} fill="var(--color-warning)" />
  if (payload.status === 'caution')
    return <polygon points={`${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`} fill="var(--color-caution)" />
  return <circle cx={cx} cy={cy} r={3.5} fill="var(--color-accent)" />
}

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload?: Point }[]; unit: string }) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  const m = STATUS_META[p.status]
  return (
    <div className="rounded-lg bg-space-800 px-3 py-2 text-xs shadow-lg">
      <div className="font-mono text-ink-dim">Mission day {p.day}</div>
      {p.value === undefined ? (
        <div className="mt-1">No reading</div>
      ) : (
        <>
          <div className="mt-1 text-base font-bold">
            {fmt(p.value, 2)} {unit}
          </div>
          <div className={`font-semibold ${m.text}`}>
            {m.shape} {m.word}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-space-900 p-4">
      <p className="section-h">{label}</p>
      {children}
    </div>
  )
}

export function TrendsScreen({ readings }: { readings: Reading[] }) {
  const [metric, setMetric] = useState<MetricId>('sleepHours')
  const def = METRICS[metric]
  const b = computeBaseline(readings, metric)
  const findings = useMemo(() => evaluate(readings), [readings])
  const finding = findings.find((f) => f.metric === metric)

  const data: Point[] = useMemo(
    () =>
      readings.map((r) => ({
        day: r.missionDay,
        value: r.values[metric],
        band: b ? [b.mean - 2 * b.sd, b.mean + 2 * b.sd] : undefined,
        status: pointStatus(def, b, r.values[metric]),
      })),
    [readings, metric, def, b],
  )

  // Last point that actually has a value (data can be stale or missing today).
  const lastWithValue = [...data].reverse().find((p) => p.value !== undefined)
  const today = readings.at(-1)?.missionDay
  const daysOld = lastWithValue && today !== undefined ? today - lastWithValue.day : 0
  const latestStatus: Status = lastWithValue?.status ?? 'nodata'

  // Y range: your data + normal band, plus a safety limit only if it is reasonably close
  // (otherwise a far-away limit would squash the line flat).
  const domain = useMemo<[number, number] | ['auto', 'auto']>(() => {
    const core = data.flatMap((p) => [p.value, p.band?.[0], p.band?.[1]]).filter((v): v is number => typeof v === 'number')
    if (core.length === 0) return ['auto', 'auto']
    let lo = Math.min(...core)
    let hi = Math.max(...core)
    const span = hi - lo || 1
    if (def.warnLow !== undefined && def.warnLow >= lo - span) lo = Math.min(lo, def.warnLow)
    if (def.warnHigh !== undefined && def.warnHigh <= hi + span) hi = Math.max(hi, def.warnHigh)
    const pad = (hi - lo) * 0.1 || 1
    return [Number((lo - pad).toFixed(1)), Number((hi + pad).toFixed(1))]
  }, [data, def])

  const limitParts: string[] = []
  if (def.warnLow !== undefined) limitParts.push(`below ${def.warnLow}`)
  if (def.warnHigh !== undefined) limitParts.push(`above ${def.warnHigh}`)
  const unit = def.unit || 'score'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      {/* Metric picker: each chip shows today's status as color + shape */}
      <div className="flex flex-wrap gap-2">
        {METRIC_LIST.map((m) => {
          const s = findings.find((f) => f.metric === m.id)?.status ?? 'nodata'
          const meta = STATUS_META[s]
          const active = m.id === metric
          return (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={active}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                active ? 'border-accent bg-accent/15 text-ink' : 'border-white/10 bg-space-900 text-ink-dim hover:text-ink'
              }`}
            >
              <span aria-hidden className={meta.text}>
                {meta.shape}
              </span>
              <span className="sr-only">{meta.word}: </span>
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label={daysOld > 0 ? `Last reading · ${daysOld} day${daysOld > 1 ? 's' : ''} ago` : 'Latest reading'}>
          {lastWithValue?.value !== undefined ? (
            <>
              <p className="text-3xl font-bold">
                {fmt(lastWithValue.value, 2)} <span className="text-base font-normal text-ink-dim">{def.unit}</span>
              </p>
              <div className="mt-1">
                <StatusBadge status={latestStatus} />
              </div>
            </>
          ) : (
            <p className="text-ink-dim">No data yet</p>
          )}
        </StatCard>
        <StatCard label="Your normal (first 7 days)">
          {b ? (
            <>
              <p className="text-3xl font-bold">
                {fmt(b.mean, 1)} <span className="text-base font-normal text-ink-dim">{def.unit}</span>
              </p>
              <p className="mt-1 text-xs text-ink-dim">
                Normal range {fmt(b.mean - 2 * b.sd)} to {fmt(b.mean + 2 * b.sd)}
              </p>
            </>
          ) : (
            <p className="text-ink-dim">Not enough early data to set a baseline</p>
          )}
        </StatCard>
        <StatCard label="Compared with your normal">
          {finding ? (
            <>
              <p className="text-3xl font-bold">
                {finding.z >= 0 ? <ArrowUp className={inl} /> : <ArrowDown className={inl} />} {fmt(Math.abs(finding.z))} <span className="text-base font-normal text-ink-dim">SD</span>
              </p>
              <p className="mt-1 text-xs text-ink-dim">{finding.reason}</p>
            </>
          ) : (
            <p className="text-ink-dim">No comparison available</p>
          )}
        </StatCard>
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-space-900 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {def.label} <span className="text-sm font-normal text-ink-dim">({unit}) over the last {data.length} mission days</span>
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-dim">
            <span>
              <ToneIcon tone="nominal" className="text-accent" /> normal
            </span>
            <span>
              <ToneIcon tone="caution" className="text-caution" /> caution
            </span>
            <span>
              <ToneIcon tone="warning" className="text-warning" /> warning
            </span>
            <span>
              <span aria-hidden className="inline-block h-3 w-2 rounded-sm bg-nominal/60" /> your normal range
            </span>
          </div>
        </div>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--color-space-700)" strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--color-ink-dim)"
                tickLine={false}
                minTickGap={24}
                label={{ value: 'Mission day', position: 'insideBottom', offset: -4, fill: 'var(--color-ink-dim)', fontSize: 12 }}
                height={42}
              />
              <YAxis stroke="var(--color-ink-dim)" tickLine={false} axisLine={false} domain={domain} tickFormatter={(v: number) => fmt(v)} width={44} />
              <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--color-ink-dim)', strokeDasharray: '3 3' }} />
              <Area dataKey="band" stroke="none" fill="var(--color-nominal)" fillOpacity={0.14} isAnimationActive={false} />
              {def.warnHigh !== undefined && (
                <ReferenceLine y={def.warnHigh} stroke="var(--color-warning)" strokeDasharray="5 4" label={{ value: 'Safety limit', position: 'insideTopRight', fill: 'var(--color-warning)', fontSize: 11 }} />
              )}
              {def.warnLow !== undefined && (
                <ReferenceLine y={def.warnLow} stroke="var(--color-warning)" strokeDasharray="5 4" label={{ value: 'Safety limit', position: 'insideBottomRight', fill: 'var(--color-warning)', fontSize: 11 }} />
              )}
              <Line dataKey="value" stroke="var(--color-accent)" strokeWidth={2.5} dot={StatusDot} activeDot={{ r: 6 }} isAnimationActive={false} />
              {lastWithValue?.value !== undefined && (
                <ReferenceDot x={lastWithValue.day} y={lastWithValue.value} r={10} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-ink-dim">
          Ringed point = latest reading.
          {limitParts.length > 0 && ` Safety limit: ${limitParts.join(' or ')} ${def.unit}. A far-away limit may sit off the chart.`}
        </p>
      </div>
    </div>
  )
}
