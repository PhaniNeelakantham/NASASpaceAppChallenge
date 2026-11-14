import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { METRIC_LIST, METRICS } from '../../content/metrics'
import { computeBaseline } from '../../engine/baseline'
import type { MetricId, Reading } from '../../types'

export function TrendsScreen({ readings }: { readings: Reading[] }) {
  const [metric, setMetric] = useState<MetricId>('sleepHours')
  const def = METRICS[metric]
  const b = computeBaseline(readings, metric)

  const data = useMemo(
    () =>
      readings.map((r) => ({
        day: r.missionDay,
        value: r.values[metric],
        band: b ? [b.mean - 2 * b.sd, b.mean + 2 * b.sd] : undefined,
      })),
    [readings, metric, b],
  )

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {METRIC_LIST.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={`min-h-11 rounded-lg px-3 text-sm ${m.id === metric ? 'bg-accent text-space-950' : 'bg-space-800 hover:bg-space-700'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="min-h-[360px] flex-1 rounded-xl bg-space-900 p-4">
        <h2 className="mb-2 font-bold">
          {def.label} <span className="text-sm font-normal text-ink-dim">({def.unit || 'score'}) · shaded band = your normal (±2 SD)</span>
        </h2>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="var(--color-space-700)" />
            <XAxis dataKey="day" stroke="var(--color-ink-dim)" label={{ value: 'Mission day', position: 'insideBottom', offset: -2, fill: 'var(--color-ink-dim)' }} />
            <YAxis stroke="var(--color-ink-dim)" domain={['auto', 'auto']} />
            <Tooltip isAnimationActive={false} contentStyle={{ background: 'var(--color-space-800)', border: 'none' }} />
            <Area dataKey="band" stroke="none" fill="var(--color-nominal)" fillOpacity={0.12} isAnimationActive={false} />
            {def.warnHigh !== undefined && <ReferenceLine y={def.warnHigh} stroke="var(--color-warning)" strokeDasharray="4 4" />}
            {def.warnLow !== undefined && <ReferenceLine y={def.warnLow} stroke="var(--color-warning)" strokeDasharray="4 4" />}
            <Line dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
