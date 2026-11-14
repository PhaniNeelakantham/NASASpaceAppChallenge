import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SourceBadge } from '../../../components/SourceBadge'

interface CbcMetric {
  unit: string
  crew: Record<string, (number | null)[]>
  mean: (number | null)[]
}
interface CbcData {
  source: string
  study: string
  url: string
  timepoints: string[]
  metrics: Record<string, CbcMetric>
}

let cache: CbcData | null = null

const CREW_COLORS = ['#64748b', '#64748b', '#64748b', '#64748b']

/**
 * Real-mission reference from NASA OSDR (Inspiration4, OSD-569):
 * what happened to an actual crew's immune cells around spaceflight.
 */
export function RealCrewChart({ metric = 'lymphocytes', title = 'Lymphocytes (immune cells)' }: { metric?: string; title?: string }) {
  const [data, setData] = useState<CbcData | null>(cache)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (cache) return
    fetch(`${import.meta.env.BASE_URL}data/i4_cbc.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CbcData) => {
        cache = d
        setData(d)
      })
      .catch(() => setFailed(true))
  }, [])

  if (failed) return null
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-white/[0.03]" />

  const m = data.metrics[metric]
  const tps = data.timepoints
  const crewIds = Object.keys(m.crew)
  const rows = tps.map((tp, i) => ({
    tp,
    mean: m.mean[i],
    ...Object.fromEntries(crewIds.map((c) => [c, m.crew[c][i]])),
  }))
  const pre = m.mean[tps.indexOf('L-3')]
  const post = m.mean[tps.indexOf('R+1')]
  const change = pre && post ? Math.round(((post - pre) / pre) * 100) : null

  return (
    <div className="rounded-xl border border-[#5eead4]/25 bg-[#5eead4]/[0.04] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Real crew reference · {title}</div>
          <div className="text-[11px] text-ink-dim">SpaceX Inspiration4 crew (4 people), before launch (L−) and after return (R+), days</div>
        </div>
        <SourceBadge kind="nasa" label={`NASA OSDR ${data.study}`} />
      </div>
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
            <ReferenceArea x1="L-3" x2="R+1" fill="#7dd3fc" fillOpacity={0.06} label={{ value: 'flight', fill: '#8b98b8', fontSize: 10, position: 'insideTop' }} />
            <XAxis dataKey="tp" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip isAnimationActive={false} contentStyle={{ background: '#0b1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
            {crewIds.map((c, i) => (
              <Line key={c} dataKey={c} stroke={CREW_COLORS[i % 4]} strokeWidth={1} dot={false} strokeOpacity={0.6} isAnimationActive={false} />
            ))}
            <Line dataKey="mean" name="Crew average" stroke="#5eead4" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {change !== null && (
        <p className="mt-2 text-[13px] leading-snug">
          On the day after landing, the crew’s average {title.split(' ')[0].toLowerCase()} were <b>{Math.abs(change)}% {change < 0 ? 'lower' : 'higher'}</b> than 3 days
          before launch ({Math.round(pre!)} → {Math.round(post!)} {m.unit}), then recovered over the following weeks. A drop like this is one reason HALO watches
          for infection signs after stressful mission phases.
        </p>
      )}
      <a href={data.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-accent underline">
        Open the dataset
      </a>
    </div>
  )
}
