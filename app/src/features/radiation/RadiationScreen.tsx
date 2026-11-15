import { inl } from '../../components/ToneIcon'
import { Radiation, RefreshCw, Sun } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { SourceBadge } from '../../components/SourceBadge'
import { EVENT_INFO, stormScale } from '../../content/spaceWeather'
import { CURRENT_DAY } from '../../data/syntheticCrew'
import { ENVIRONMENT_LIST, ENVIRONMENTS, type EnvironmentId } from '../../state/mission'
import { useSpaceWeather, type DonkiEvent } from '../../state/spaceWeather'

const CAREER_LIMIT_MSV = 600 // NASA career effective-dose limit
const PRIOR_CAREER_MSV = 40 // simulated dose from earlier missions
const LANES: DonkiEvent['type'][] = ['SEP', 'CME', 'GST', 'RBE']
const LEVEL_COLOR = { nominal: '#2dd4bf', caution: '#fbbf24', warning: '#ff5a4e' } as const

const day = (iso: string) => new Date(iso).toUTCString().slice(5, 16)

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">{label}</div>
      <div className="mt-1 text-3xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-ink-dim">{sub}</div>}
    </div>
  )
}

/** Radiation and space weather, from NASA DONKI, interpreted for where the crew is. */
export function RadiationScreen({ env }: { env: EnvironmentId }) {
  const sw = useSpaceWeather()
  const e = ENVIRONMENTS[env]
  const a = sw.assess(env)
  const color = LEVEL_COLOR[a.level]

  const { points, domain, counts } = useMemo(() => {
    const ev = sw.events.filter((x) => LANES.includes(x.type) && x.time)
    const t = ev.map((x) => new Date(x.time).getTime())
    const end = sw.asOf.getTime()
    const start = t.length ? Math.min(...t) - 864e5 : end - 30 * 864e5 // one day before the first event
    const pts = ev.map((x) => ({
      x: new Date(x.time).getTime(),
      y: LANES.length - 1 - LANES.indexOf(x.type),
      z: x.type === 'CME' ? Math.max(40, (x.speed ?? 300) / 6) : x.type === 'GST' ? 60 + (x.kp ?? 5) * 25 : 220,
      ev: x,
    }))
    const of = (k: DonkiEvent['type']) => ev.filter((x) => x.type === k)
    const cmes = of('CME')
    const storms = of('GST')
    const seps = of('SEP')
    return {
      points: pts,
      domain: [start, end] as [number, number],
      counts: {
        cme: cmes.length,
        fastest: Math.max(0, ...cmes.map((c) => c.speed ?? 0)),
        storms: storms.length,
        maxKp: Math.max(0, ...storms.map((s) => s.kp ?? 0)),
        sep: seps.length,
        lastSep: seps.at(-1),
        rbe: of('RBE').length,
      },
    }
  }, [sw.events, sw.asOf])

  // Simulated mission profile × published dose rate for this environment.
  const missionDose = Math.round(CURRENT_DAY * e.doseMsvPerDay)
  const career = PRIOR_CAREER_MSV + missionDose
  const pct = Math.min(100, (career / CAREER_LIMIT_MSV) * 100)
  const daysLeft = Math.max(0, Math.round((CAREER_LIMIT_MSV - career) / e.doseMsvPerDay))

  const recent = [...sw.events].filter((x) => LANES.includes(x.type)).reverse().slice(0, 12)
  const rateData = ENVIRONMENT_LIST.map((x) => ({ name: x.kind, rate: x.doseMsvPerDay, id: x.id }))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Radiation & space weather</h1>
          <p className="text-sm text-ink-dim">
            Real events from NASA’s DONKI space-weather database, interpreted for your environment: <b className="text-ink">{e.kind}</b> · {e.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge
            kind={sw.source === 'unavailable' ? 'sim' : 'nasa'}
            label={
              sw.source === 'live'
                ? 'NASA DONKI · live'
                : sw.source === 'snapshot'
                  ? `NASA DONKI · snapshot ${sw.fetchedAt ? sw.fetchedAt.slice(0, 10) : ''}`
                  : 'DONKI unavailable'
            }
          />
          {sw.scenario === 'today' && (
            <button onClick={sw.refresh} disabled={sw.refreshing} className="min-h-11 rounded-xl border border-white/10 px-3 font-mono text-[11px] uppercase tracking-wider text-accent hover:bg-white/5 disabled:opacity-50">
              {sw.refreshing ? 'Refreshing…' : <><RefreshCw className={inl} /> Refresh from NASA</>}
            </button>
          )}
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
            {(
              [
                ['today', 'Today'],
                ['may2024', 'Replay May 2024 storm'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => sw.setScenario(id)}
                className={`min-h-10 rounded-lg px-3 font-mono text-[11px] uppercase tracking-wider ${sw.scenario === id ? 'bg-accent/20 text-accent' : 'text-ink-dim hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {sw.refreshError && <p className="text-xs text-ink-dim">Live refresh failed ({sw.refreshError}); showing the bundled snapshot.</p>}
      {sw.scenario === 'may2024' && (
        <p className="rounded-xl border border-caution/30 bg-caution/5 px-3 py-2 text-sm">
          Replaying the real May 2024 storm (one of the strongest in 20 years) as of <b>10 May 2024, 18:00 UTC</b>. Events after that moment are hidden, as they would
          be to a crew living through it.
        </p>
      )}

      {/* Status + dose */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border p-5 lg:col-span-2" style={{ borderColor: `${color}66`, background: `${color}0d` }}>
          <div className="flex items-start gap-4">
            <span className="text-4xl" style={{ color }} aria-hidden>
              {a.level === 'nominal' ? <Sun className="h-10 w-10" /> : <Radiation className="h-10 w-10" />}
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
                {a.level === 'nominal' ? 'Nominal' : a.level === 'caution' ? 'Caution' : 'Warning'} · right now
              </div>
              <h2 className="text-2xl font-bold leading-tight">{a.title}</h2>
              <p className="mt-1 text-[15px] text-ink/90">{a.detail}</p>
              {a.action ? (
                <p className="mt-3 rounded-xl border px-3 py-2 text-[15px] font-semibold" style={{ borderColor: `${color}80`, color }}>
                  What to do: {a.action}
                </p>
              ) : (
                <p className="mt-3 text-sm text-ink-dim">
                  No shelter needed. HALO checks DONKI for solar particle events in the last 72 hours and adapts the advice to {e.kind.toLowerCase()} shielding.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Career dose (estimate)</div>
            <SourceBadge kind="sim" label="Estimate" />
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums">
            {career} <span className="text-base font-normal text-ink-dim">/ {CAREER_LIMIT_MSV} mSv</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded bg-white/10">
            <div className="h-full rounded" style={{ width: `${pct}%`, background: pct > 80 ? '#ff5a4e' : pct > 50 ? '#fbbf24' : '#2dd4bf' }} />
          </div>
          <p className="mt-2 text-sm">
            At ~{e.doseMsvPerDay} mSv/day here, the NASA career limit is about <b>{daysLeft} days</b> away.
          </p>
          <p className="mt-1 text-[11px] leading-snug text-ink-dim">
            {CURRENT_DAY} mission days × published dose rate for this environment + {PRIOR_CAREER_MSV} mSv simulated prior career. A real crew would read their personal
            dosimeter.
          </p>
        </section>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Solar particle events" value={String(counts.sep)} sub={counts.lastSep ? `latest ${day(counts.lastSep.time)}` : 'none in this window'} color={counts.sep ? '#ff5a4e' : undefined} />
        <Tile label="Coronal mass ejections" value={String(counts.cme)} sub={counts.fastest ? `fastest ${Math.round(counts.fastest)} km/s` : undefined} />
        <Tile label="Geomagnetic storms" value={String(counts.storms)} sub={counts.maxKp ? `strongest Kp ${Math.round(counts.maxKp)} · ${stormScale(counts.maxKp)}` : undefined} color={counts.maxKp >= 7 ? '#fbbf24' : undefined} />
        <Tile label="Radiation belt events" value={String(counts.rbe)} sub="matters near Earth (ISS)" />
      </div>

      {/* Timeline */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Event timeline</h2>
          <span className="text-xs text-ink-dim">
            {day(new Date(domain[0]).toISOString())} → {day(new Date(domain[1]).toISOString())} · bigger dot = faster CME / stronger storm
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="x"
                type="number"
                domain={domain}
                tickFormatter={(v: number) => new Date(v).toUTCString().slice(5, 11)}
                stroke="#64748b"
                fontSize={11}
                tickCount={8}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[-0.5, LANES.length - 0.5]}
                ticks={LANES.map((_, i) => i)}
                tickFormatter={(v: number) => EVENT_INFO[LANES[LANES.length - 1 - v]].short}
                stroke="#64748b"
                fontSize={11}
                width={52}
              />
              <ZAxis dataKey="z" range={[30, 400]} />
              <Tooltip isAnimationActive={false}
                cursor={false}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as { ev: DonkiEvent } | undefined
                  if (!p) return null
                  const x = p.ev
                  return (
                    <div className="rounded-lg border border-white/10 bg-space-900 px-3 py-2 text-xs">
                      <div className="font-semibold" style={{ color: EVENT_INFO[x.type].color }}>
                        {EVENT_INFO[x.type].label}
                      </div>
                      <div className="text-ink-dim">{new Date(x.time).toUTCString().slice(5, 22)} UTC</div>
                      {x.speed ? <div>{Math.round(x.speed)} km/s</div> : null}
                      {x.kp ? <div>Kp {Math.round(x.kp)} · {stormScale(x.kp)}</div> : null}
                    </div>
                  )
                }}
              />
              <Scatter data={points} isAnimationActive={false}>
                {points.map((p, i) => (
                  <Cell key={i} fill={EVENT_INFO[p.ev.type].color} fillOpacity={p.ev.type === 'CME' ? 0.45 : 0.9} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Meaning */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-2 font-semibold">What these events mean for a crew</h2>
          <ul className="space-y-2">
            {LANES.map((k) => (
              <li key={k} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EVENT_INFO[k].color }} />
                <span>
                  <b>{EVENT_INFO[k].label}.</b> {EVENT_INFO[k].meaning}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Exposure by environment */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Everyday dose by environment</h2>
            <SourceBadge kind="published" label="Published measurements" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rateData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 10 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} unit=" mSv/d" />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={140} />
                <Tooltip isAnimationActive={false} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#0b1224', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="rate" name="mSv per day" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                  {rateData.map((r) => (
                    <Cell key={r.id} fill={r.id === env ? '#7dd3fc' : 'rgba(125,211,252,0.25)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] leading-snug text-ink-dim">
            Background (galactic) radiation, before any solar event. ISS ~0.3–0.8 · deep-space cruise ~1.8 (Curiosity RAD) · Mars surface ~0.64 (Curiosity RAD) · Moon ~1.4
            (Chang’e-4).
          </p>
        </section>
      </div>

      {/* Recent events */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-2 font-semibold">Latest events</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-dim">No events loaded. Use “Refresh from NASA” or run the fetch script.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {recent.map((x) => (
              <li key={`${x.type}-${x.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                <span className="w-28 shrink-0 font-mono text-xs text-ink-dim">{day(x.time)}</span>
                <span className="font-semibold" style={{ color: EVENT_INFO[x.type].color }}>
                  {EVENT_INFO[x.type].label}
                </span>
                <span className="text-ink-dim">
                  {x.speed ? `${Math.round(x.speed)} km/s` : x.kp ? `Kp ${Math.round(x.kp)} · ${stormScale(x.kp)}` : ''}
                </span>
                {x.link && (
                  <a href={x.link} target="_blank" rel="noreferrer" className="ml-auto text-xs text-accent underline">
                    DONKI record
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
