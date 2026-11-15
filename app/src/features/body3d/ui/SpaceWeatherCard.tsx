import { inl } from '../../../components/ToneIcon'
import { ChevronDown, ChevronUp, Radiation, RefreshCw, Sun } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SourceBadge } from '../../../components/SourceBadge'
import type { EnvironmentId } from '../../../state/mission'
import { useSpaceWeather, type DonkiEvent } from '../../../state/spaceWeather'
import { EVENT_INFO, stormScale } from '../../../content/spaceWeather'
import { STATUS_HEX } from '../theme'


function describe(e: DonkiEvent): string {
  const label = EVENT_INFO[e.type].label
  if (e.type === 'FLR' && e.classType) return `${label} · class ${e.classType}`
  if (e.type === 'GST' && e.kp) return `${label} · Kp ${Math.round(e.kp)} (${stormScale(e.kp)})`
  if (e.type === 'CME' && e.speed) return `${label} · ${Math.round(e.speed)} km/s`
  return label
}

/** Space weather from NASA DONKI, interpreted for the current environment. */
export function SpaceWeatherCard({ env }: { env: EnvironmentId }) {
  const sw = useSpaceWeather()
  const a = sw.assess(env)
  const [open, setOpen] = useState(a.level !== 'nominal')
  const color = a.level === 'nominal' ? STATUS_HEX.nominal : STATUS_HEX[a.level]
  const shown = [...sw.events].reverse().slice(0, 6)

  return (
    <section className="glass pointer-events-auto p-3" style={a.level !== 'nominal' ? { borderColor: `${color}80` } : undefined} data-tour="spaceweather">
      <button onClick={() => setOpen((o) => !o)} className="flex min-h-11 w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className="text-lg" style={{ color }} aria-hidden>
          {a.level === 'nominal' ? <Sun className="h-5 w-5" /> : <Radiation className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Space weather</div>
          <div className="truncate text-[13px] font-semibold" style={{ color: a.level === 'nominal' ? undefined : color }}>
            {a.title}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-dim">{open ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-1 text-[13px] leading-snug">{a.detail}</p>
            {a.action && (
              <p className="mt-2 rounded-lg border px-2.5 py-2 text-[13px] font-semibold" style={{ borderColor: `${color}66`, color }}>
                {a.action}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceBadge
                kind={sw.source === 'unavailable' ? 'sim' : 'nasa'}
                label={sw.source === 'live' ? 'NASA DONKI · live' : sw.source === 'snapshot' ? 'NASA DONKI · snapshot' : 'Feed unavailable'}
              />
              {sw.scenario === 'today' && (
                <button onClick={sw.refresh} disabled={sw.refreshing} className="min-h-9 rounded-lg px-2 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-white/5 disabled:opacity-50">
                  {sw.refreshing ? 'Refreshing…' : <><RefreshCw className={inl} /> Refresh from NASA</>}
                </button>
              )}
            </div>
            {sw.refreshError && <p className="mt-1 text-[11px] text-ink-dim">Live refresh failed ({sw.refreshError}). Showing the bundled snapshot.</p>}

            {shown.length > 0 && (
              <ul className="mt-2 space-y-1">
                {shown.map((e) => (
                  <li key={`${e.type}-${e.id}`} className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className={e.type === 'SEP' ? 'font-semibold' : 'text-ink/85'}>{describe(e)}</span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-dim">{e.time.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-1 rounded-xl bg-white/[0.04] p-1">
              {(
                [
                  ['today', 'Today'],
                  ['may2024', 'Replay May 2024 storm'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => sw.setScenario(id)}
                  className={`min-h-10 flex-1 rounded-lg font-mono text-[10px] uppercase tracking-wider ${sw.scenario === id ? 'bg-accent/20 text-accent' : 'text-ink-dim hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {sw.scenario === 'may2024' && (
              <p className="mt-1 text-[11px] leading-snug text-ink-dim">Real DONKI events from the May 2024 storm, assessed as of 12 May 2024.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
