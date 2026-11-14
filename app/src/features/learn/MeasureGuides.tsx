import { GUIDES, type MeasurementGuide } from '../../content/measurementGuides'
import { METRICS } from '../../content/metrics'
import type { MetricId } from '../../types'

/** Builds a line like "Resting heart rate: warning if below 40 or above 120 bpm" from metrics.ts. */
function limitText(id: MetricId): string | null {
  const m = METRICS[id]
  const parts: string[] = []
  if (m.warnLow !== undefined) parts.push(`below ${m.warnLow}`)
  if (m.warnHigh !== undefined) parts.push(`above ${m.warnHigh}`)
  if (parts.length === 0) return null
  return `${m.label}: warning if ${parts.join(' or ')} ${m.unit}`.trim()
}

function GuideCard({ guide }: { guide: MeasurementGuide }) {
  const limits = guide.metrics.map(limitText).filter((t): t is string => t !== null)
  return (
    <details className="rounded-xl bg-space-900 p-4">
      <summary className="cursor-pointer">
        <span className="font-bold">{guide.title}</span>
        <span className="mt-1 block text-xs text-accent">
          {guide.tool} · {guide.duration}
        </span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-ink-dim">{guide.inSpace}</p>
        <div>
          <p className="section-h">Steps</p>
          <ol className="list-decimal space-y-1 pl-5">
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="section-h">Tips</p>
          <ul className="list-disc space-y-1 pl-5">
            {guide.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-h">Measure again if</p>
          <p>{guide.recheckIf}</p>
        </div>
        {limits.length > 0 && (
          <div className="font-mono text-xs text-ink-dim">
            {limits.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

export function MeasureGuides() {
  return (
    <div>
      <p className="mb-4 text-sm text-ink-dim">
        General reference for taking each daily measurement. Always follow your mission&rsquo;s approved procedure.
        Tap a card to open it.
      </p>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>
    </div>
  )
}
