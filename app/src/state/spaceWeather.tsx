import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EnvironmentId } from './mission'

/** A NASA DONKI space-weather event (trimmed to what HALO shows). */
export interface DonkiEvent {
  type: 'SEP' | 'FLR' | 'CME' | 'GST'
  time: string
  id: string
  instruments?: string[]
  classType?: string
  speed?: number | null
  kp?: number | null
  link?: string
}

interface Snapshot {
  source: string
  fetchedAt: string
  recent: { start: string; end: string; events: DonkiEvent[] }
  scenarios: Record<string, { label: string; start: string; end: string; events: DonkiEvent[] }>
  missing?: string[]
}

export type FeedSource = 'live' | 'snapshot' | 'unavailable'
export type ScenarioId = 'today' | 'may2024'

export interface SpaceWeatherAssessment {
  level: 'nominal' | 'caution' | 'warning'
  title: string
  detail: string
  /** What to do, specific to the environment. */
  action?: string
  lastSep?: DonkiEvent
  events: DonkiEvent[]
}

interface Api {
  events: DonkiEvent[]
  source: FeedSource
  fetchedAt?: string
  scenario: ScenarioId
  setScenario: (s: ScenarioId) => void
  /** The "current time" the assessment uses (real now, or the scenario's date). */
  asOf: Date
  /** Pull the last 30 days from NASA DONKI now. */
  refresh: () => void
  refreshing: boolean
  refreshError?: string
  assess: (env: EnvironmentId) => SpaceWeatherAssessment
}

const Ctx = createContext<Api | null>(null)
const BASE = import.meta.env.BASE_URL
const KEY = (import.meta.env.VITE_NASA_API_KEY as string | undefined) || 'DEMO_KEY'
// The May 2024 scenario is assessed as if "now" were just after the particle event began.
const SCENARIO_NOW: Record<Exclude<ScenarioId, 'today'>, string> = { may2024: '2024-05-12T12:00:00Z' }

const SHELTER: Record<EnvironmentId, string> = {
  iss: 'Move to the more shielded modules if Mission Control asks; postpone spacewalks.',
  transit: 'Go to the storm shelter (water-walled sleep stations) until the alert clears.',
  lunarBase: 'Stay inside the habitat and postpone all EVAs.',
  rover: 'Head back to base, or shelter in the rover’s shielded section if you can’t make it.',
  marsBase: 'Postpone EVAs and stay inside the habitat.',
}
// How exposed each environment is to a particle event (Earth's field / a planet's bulk help).
const EXPOSED: Record<EnvironmentId, boolean> = { iss: false, transit: true, lunarBase: true, rover: true, marsBase: false }

async function fetchLive(signal: AbortSignal): Promise<DonkiEvent[]> {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 864e5)
  const d = (x: Date) => x.toISOString().slice(0, 10)
  const kinds = ['SEP', 'FLR', 'CME', 'GST'] as const
  const results = await Promise.all(
    kinds.map(async (k) => {
      const r = await fetch(`https://api.nasa.gov/DONKI/${k}?startDate=${d(start)}&endDate=${d(end)}&api_key=${KEY}`, { signal })
      if (!r.ok) throw new Error(`${k} ${r.status}`)
      const txt = await r.text()
      const arr = txt.trim() ? (JSON.parse(txt) as Record<string, unknown>[]) : []
      return arr.map((e): DonkiEvent => {
        if (k === 'SEP') return { type: k, time: e.eventTime as string, id: e.sepID as string, link: e.link as string }
        if (k === 'FLR') return { type: k, time: (e.peakTime ?? e.beginTime) as string, id: e.flrID as string, classType: e.classType as string, link: e.link as string }
        if (k === 'CME') return { type: k, time: e.startTime as string, id: e.activityID as string, link: e.link as string }
        const kp = Math.max(0, ...(((e.allKpIndex as { kpIndex: number }[]) ?? []).map((x) => x.kpIndex)))
        return { type: k, time: e.startTime as string, id: e.gstID as string, kp, link: e.link as string }
      })
    }),
  )
  return results.flat().sort((a, b) => a.time.localeCompare(b.time))
}

function hoursBetween(a: Date, b: string) {
  return (a.getTime() - new Date(b).getTime()) / 36e5
}

export function SpaceWeatherProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [live, setLive] = useState<DonkiEvent[] | null>(null)
  const [scenario, setScenario] = useState<ScenarioId>('today')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string>()

  const refresh = useCallback(() => {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 10000)
    setRefreshing(true)
    setRefreshError(undefined)
    fetchLive(ctl.signal)
      .then(setLive)
      .catch((e: Error) => setRefreshError(e.name === 'AbortError' ? 'timed out' : e.message))
      .finally(() => {
        clearTimeout(t)
        setRefreshing(false)
      })
  }, [])

  // Bundled snapshot first (works offline). Auto-refresh only with a personal API key —
  // the shared DEMO_KEY allows ~30 requests/hour, so otherwise refresh is on demand.
  useEffect(() => {
    fetch(`${BASE}data/donki_snapshot.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnap)
      .catch(() => setSnap(null))
    if (KEY !== 'DEMO_KEY') refresh()
  }, [refresh])

  const api = useMemo<Api>(() => {
    const scenarioData = scenario !== 'today' ? snap?.scenarios[scenario] : undefined
    const events = scenarioData ? scenarioData.events : (live ?? snap?.recent.events ?? [])
    const source: FeedSource = scenarioData ? 'snapshot' : live ? 'live' : snap && snap.recent.events.length > 0 ? 'snapshot' : 'unavailable'
    const asOf = scenario !== 'today' ? new Date(SCENARIO_NOW[scenario]) : new Date()
    const visible = events.filter((e) => new Date(e.time) <= asOf)

    const assess = (env: EnvironmentId): SpaceWeatherAssessment => {
      const seps = visible.filter((e) => e.type === 'SEP')
      const lastSep = seps.at(-1)
      const recentSep = seps.filter((e) => hoursBetween(asOf, e.time) <= 72)
      const bigFlare = visible.filter((e) => e.type === 'FLR' && e.classType?.startsWith('X') && hoursBetween(asOf, e.time) <= 48)
      if (source === 'unavailable')
        return { level: 'nominal', title: 'Space weather feed unavailable', detail: 'No NASA DONKI data loaded. Follow the ground’s radiation schedule.', events: [] }
      if (recentSep.length > 0) {
        const exposed = EXPOSED[env]
        return {
          level: exposed ? 'warning' : 'caution',
          title: 'Solar particle event in progress',
          detail: `NASA DONKI reported a solar energetic particle event ${new Date(recentSep.at(-1)!.time).toUTCString().slice(5, 22)} UTC.${exposed ? ' You have little shielding here.' : ''}`,
          action: SHELTER[env],
          lastSep: recentSep.at(-1),
          events: visible,
        }
      }
      if (bigFlare.length > 0)
        return {
          level: 'caution',
          title: `Strong solar flare (${bigFlare.at(-1)!.classType})`,
          detail: 'A particle event can follow within hours. Keep the shelter plan ready and limit EVAs.',
          action: SHELTER[env],
          events: visible,
        }
      return {
        level: 'nominal',
        title: 'Space weather quiet',
        detail: lastSep ? `Last solar particle event: ${new Date(lastSep.time).toUTCString().slice(5, 16)}.` : 'No solar particle events in the last 60 days.',
        lastSep,
        events: visible,
      }
    }
    return { events: visible, source, fetchedAt: snap?.fetchedAt, scenario, setScenario, asOf, refresh, refreshing, refreshError, assess }
  }, [snap, live, scenario, refresh, refreshing, refreshError])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useSpaceWeather(): Api {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSpaceWeather must be used inside <SpaceWeatherProvider>')
  return c
}
