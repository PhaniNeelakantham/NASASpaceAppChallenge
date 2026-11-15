import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ALL_TASKS, BADGES, DAILY_TASKS, WATER_GOAL, levelFor, type RoutineTask } from '../content/routine'
import { CREW } from '../data/syntheticCrew'
import { usePersistentState } from './persist'

// Daily routine + gamification. Today's progress is saved in localStorage per crew member;
// the previous 30 days are SIMULATED (deterministic) so streaks and badges have a history to show.

export interface PvtResult {
  medianMs: number
  lapses: number
  trials: number[]
}

export interface DayLog {
  /** Task id → time it was completed (ms). */
  done: Record<string, number>
  water: number
  pvt?: PvtResult
}

export type TaskState = 'done' | 'due' | 'overdue' | 'upcoming' | 'open'

type Store = Record<string, Record<string, DayLog>>

const STORAGE_KEY = 'halo.routine.v1'
const EXTRA_XP = 10
const HISTORY_DAYS = 30
const EMPTY: DayLog = { done: {}, water: 0 }

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Week key = date of that week's Monday, prefixed so it can't clash with a day key. */
function weekKey(d: Date): string {
  const offset = (d.getDay() + 6) % 7
  return `W${dayKey(addDays(d, -offset))}`
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * Simulated routine history for the 30 days before `today`. Matches the stories in syntheticCrew:
 *  - c1 (sleep debt): skipped wind-down for the last 4 nights, reaction-test lapses rising
 *  - c2 (fever): rested instead of exercising yesterday, the right call when sick
 *  - c3 / c4: a missed check-in breaks their streak, so streaks differ across the crew
 */
function seedHistory(crewId: string, today: Date): Record<string, DayLog> {
  const r = rng(crewId.charCodeAt(1) * 104729)
  const out: Record<string, DayLog> = {}
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const date = addDays(today, -back)
    const t = date.getTime()
    const done: Record<string, number> = {}
    const did = (id: string, p: number) => {
      if (r() < p) done[id] = t
    }
    const missedCheckin = (crewId === 'c3' && back === 9) || (crewId === 'c4' && back === 3)
    if (!missedCheckin) done.checkin = t
    const water = r() < 0.82 ? WATER_GOAL : Math.floor(5 + r() * 4)
    if (water >= WATER_GOAL) done.hydration = t
    const sick = crewId === 'c2' && back <= 1
    if (!sick) {
      did('exercise-res', 0.85)
      did('exercise-cardio', 0.78)
    }
    did('connect', 0.8)
    if (!(crewId === 'c1' && back <= 4)) did('wind-down', 0.88)
    let pvt: PvtResult | undefined
    if (r() < 0.9) {
      const tired = crewId === 'c1' && back <= 4
      // Simulated history never has a perfect (0-lapse) test, so "Sharp Shooter" is earned live.
      const lapses = tired ? 5 - back + 1 : r() < 0.6 ? 1 : 2
      pvt = { medianMs: Math.round((tired ? 330 : 255) + r() * 40), lapses, trials: [] }
      done.pvt = t
    }
    // Leave "Clean Sweep" (every task in one day) for the astronaut to earn live.
    if (DAILY_TASKS.every((tk) => done[tk.id])) delete done.connect
    out[dayKey(date)] = { done, water, pvt }
  }
  // Weekly tasks for the previous 4 weeks.
  for (let w = 1; w <= 4; w++) {
    const k = weekKey(addDays(today, -7 * w))
    out[k] = { done: { vision: 1, mass: 1 }, water: 0 }
  }
  return out
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function saveStore(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable */
  }
}

const XP_BY_ID: Record<string, number> = Object.fromEntries(ALL_TASKS.map((t) => [t.id, t.xp]))

export interface Stats {
  xp: number
  level: ReturnType<typeof levelFor>
  streaks: { checkin: number; exercise: number; water: number; sleep: number }
  /** True when today's check-in is still missing, so the streak ends tonight unless it's done. */
  checkinAtRisk: boolean
  badges: Set<string>
  todayPct: number
  weekPct: number
}

function computeStats(log: Record<string, DayLog>, today: Date): Stats {
  const days: DayLog[] = [] // oldest → today
  for (let back = HISTORY_DAYS; back >= 0; back--) days.push(log[dayKey(addDays(today, -back))] ?? EMPTY)
  const todayLog = days[days.length - 1]

  const streakOf = (ok: (d: DayLog) => boolean) => {
    let i = days.length - 1
    if (!ok(days[i])) i-- // today not done yet doesn't break the streak
    let n = 0
    while (i >= 0 && ok(days[i])) {
      n++
      i--
    }
    let best = 0
    let run = 0
    for (const d of days) {
      run = ok(d) ? run + 1 : 0
      best = Math.max(best, run)
    }
    return { n, best }
  }
  const checkin = streakOf((d) => !!d.done.checkin)
  const exercise = streakOf((d) => !!d.done['exercise-res'] && !!d.done['exercise-cardio'])
  const water = streakOf((d) => !!d.done.hydration)
  const sleep = streakOf((d) => !!d.done['wind-down'])

  let xp = 0
  for (const d of Object.values(log)) for (const id of Object.keys(d.done)) xp += XP_BY_ID[id] ?? EXTRA_XP

  const badges = new Set<string>()
  if (days.some((d) => d.done.checkin)) badges.add('first-light')
  if (checkin.best >= 7) badges.add('week')
  if (checkin.best >= 30) badges.add('month')
  if (exercise.best >= 7) badges.add('iron')
  if (water.best >= 5) badges.add('hydro')
  if (days.some((d) => d.pvt && d.pvt.lapses === 0)) badges.add('sharp')
  if (sleep.best >= 5) badges.add('sleep')
  if (days.some((d) => DAILY_TASKS.every((t) => d.done[t.id]))) badges.add('sweep')

  const pct = (d: DayLog) => DAILY_TASKS.filter((t) => d.done[t.id]).length / DAILY_TASKS.length
  const week = days.slice(-7)
  return {
    xp,
    level: levelFor(xp),
    streaks: { checkin: checkin.n, exercise: exercise.n, water: water.n, sleep: sleep.n },
    checkinAtRisk: !todayLog.done.checkin,
    badges,
    todayPct: pct(todayLog),
    weekPct: week.reduce((s, d) => s + pct(d), 0) / week.length,
  }
}

interface RoutineApi {
  now: number
  crewId: string
  today: DayLog
  week: DayLog
  stats: Stats
  /** Last 7 days, oldest first, for the mini history strip. */
  recent: { key: string; log: DayLog }[]
  crewWeek: { crewId: string; pct: number }[]
  stateOf: (task: RoutineTask) => TaskState
  isDone: (id: string, cadence?: RoutineTask['cadence']) => boolean
  complete: (id: string, cadence?: RoutineTask['cadence']) => void
  undo: (id: string, cadence?: RoutineTask['cadence']) => void
  addWater: (delta: number) => void
  recordPvt: (r: PvtResult) => void
  /** Most recent XP gain, for the "+25 XP" animation. */
  lastGain: { id: string; xp: number; at: number } | null
  newBadge: string | null
  clearNewBadge: () => void
  /** Daily tasks that are due now and not done (and not snoozed). */
  reminders: RoutineTask[]
  snooze: (id: string, minutes: number) => void
  notificationsOn: boolean
  enableNotifications: () => void
  demoHour: number | null
  setDemoHour: (h: number | null) => void
}

const Ctx = createContext<RoutineApi | null>(null)

export function RoutineProvider({ crewId, children }: { crewId: string; children: ReactNode }) {
  const [store, setStore] = useState<Store>(loadStore)
  const [offset, setOffset] = useState(0)
  const [demoHour, setDemoHourState] = useState<number | null>(null)
  const [tick, setTick] = useState(() => Date.now())
  const [lastGain, setLastGain] = useState<RoutineApi['lastGain']>(null)
  const [newBadge, setNewBadge] = useState<string | null>(null)
  const [snoozed, setSnoozed] = usePersistentState<Record<string, number>>('halo.routine.snoozed', {})
  const [notificationsOn, setNotificationsOn] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
  )

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const now = tick + offset
  const todayDate = useMemo(() => new Date(now), [now])
  const todayK = dayKey(todayDate)
  const weekK = weekKey(todayDate)

  // Seeds only depend on the calendar day, so recompute them once per day.
  const seeds = useMemo(() => {
    const d = new Date(`${todayK}T12:00:00`)
    return Object.fromEntries(CREW.map((c) => [c.id, seedHistory(c.id, d)])) as Record<string, Record<string, DayLog>>
  }, [todayK])

  const logFor = useCallback((id: string) => ({ ...seeds[id], ...store[id] }), [seeds, store])
  const log = useMemo(() => logFor(crewId), [logFor, crewId])
  const today = log[todayK] ?? EMPTY
  const week = log[weekK] ?? EMPTY
  const stats = useMemo(() => computeStats(log, todayDate), [log, todayDate])

  const recent = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const k = dayKey(addDays(todayDate, i - 6))
      return { key: k, log: log[k] ?? EMPTY }
    }),
    [log, todayDate],
  )

  const crewWeek = useMemo(
    () => CREW.map((c) => ({ crewId: c.id, pct: computeStats(logFor(c.id), todayDate).weekPct })),
    [logFor, todayDate],
  )

  // Celebrate badges earned by the astronaut's own actions (not on crew switch or first load).
  const prevBadges = useRef<{ crew: string; set: Set<string> } | null>(null)
  useEffect(() => {
    const prev = prevBadges.current
    if (prev && prev.crew === crewId) {
      const fresh = [...stats.badges].find((b) => !prev.set.has(b))
      if (fresh) setNewBadge(fresh)
    }
    prevBadges.current = { crew: crewId, set: stats.badges }
  }, [stats.badges, crewId])

  const update = useCallback(
    (key: string, fn: (d: DayLog) => DayLog) => {
      setStore((s) => {
        const mine = s[crewId] ?? {}
        const base = mine[key] ?? seeds[crewId]?.[key] ?? EMPTY
        const next = { ...s, [crewId]: { ...mine, [key]: fn({ ...base, done: { ...base.done } }) } }
        saveStore(next)
        return next
      })
    },
    [crewId, seeds],
  )

  const keyFor = useCallback((cadence?: RoutineTask['cadence']) => (cadence === 'weekly' ? weekK : todayK), [todayK, weekK])

  const isDone = useCallback(
    (id: string, cadence?: RoutineTask['cadence']) => !!(cadence === 'weekly' ? week : today).done[id],
    [today, week],
  )

  const complete = useCallback(
    (id: string, cadence?: RoutineTask['cadence']) => {
      if (isDone(id, cadence)) return
      update(keyFor(cadence), (d) => ({ ...d, done: { ...d.done, [id]: Date.now() } }))
      setLastGain({ id, xp: XP_BY_ID[id] ?? EXTRA_XP, at: Date.now() })
    },
    [isDone, update, keyFor],
  )

  const undo = useCallback(
    (id: string, cadence?: RoutineTask['cadence']) => {
      update(keyFor(cadence), (d) => {
        const done = { ...d.done }
        delete done[id]
        return { ...d, done }
      })
    },
    [update, keyFor],
  )

  const addWater = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(WATER_GOAL + 6, today.water + delta))
      const reached = next >= WATER_GOAL && !today.done.hydration
      update(todayK, (d) => {
        const done = { ...d.done }
        if (next >= WATER_GOAL) done.hydration ??= Date.now()
        else delete done.hydration
        return { ...d, water: next, done }
      })
      if (reached) setLastGain({ id: 'hydration', xp: XP_BY_ID.hydration, at: Date.now() })
    },
    [today, todayK, update],
  )

  const recordPvt = useCallback(
    (res: PvtResult) => {
      const first = !today.done.pvt
      update(todayK, (d) => ({ ...d, pvt: res, done: { ...d.done, pvt: d.done.pvt ?? Date.now() } }))
      if (first) setLastGain({ id: 'pvt', xp: XP_BY_ID.pvt, at: Date.now() })
    },
    [today, todayK, update],
  )

  const stateOf = useCallback(
    (task: RoutineTask): TaskState => {
      if (isDone(task.id, task.cadence)) return 'done'
      if (!task.window) return 'open'
      const h = todayDate.getHours() + todayDate.getMinutes() / 60
      if (h < task.window[0]) return 'upcoming'
      if (h < task.window[1]) return 'due'
      return 'overdue'
    },
    [isDone, todayDate],
  )

  const reminders = useMemo(
    () => DAILY_TASKS.filter((t) => stateOf(t) === 'due' && (snoozed[`${crewId}:${t.id}`] ?? 0) < now),
    [stateOf, snoozed, crewId, now],
  )

  const snooze = useCallback((id: string, minutes: number) => {
    setSnoozed((s) => ({ ...s, [`${crewId}:${id}`]: Date.now() + offset + minutes * 60_000 }))
  }, [crewId, offset])

  // System notification once per task per day, when it first becomes due.
  const notified = useRef(new Set<string>())
  useEffect(() => {
    if (!notificationsOn) return
    for (const t of reminders) {
      const k = `${crewId}:${todayK}:${t.id}`
      if (notified.current.has(k)) continue
      notified.current.add(k)
      try {
        new Notification(`HALO · ${t.label}`, { body: t.howTo, tag: k })
      } catch {
        /* notifications unavailable */
      }
    }
  }, [reminders, notificationsOn, crewId, todayK])

  const enableNotifications = useCallback(() => {
    if (typeof Notification === 'undefined') return
    void Notification.requestPermission().then((p) => setNotificationsOn(p === 'granted'))
  }, [])

  const setDemoHour = useCallback((h: number | null) => {
    setDemoHourState(h)
    if (h === null) return setOffset(0)
    const target = new Date()
    target.setHours(h, 0, 0, 0)
    setOffset(target.getTime() - Date.now())
    setTick(Date.now())
  }, [])

  const api = useMemo<RoutineApi>(
    () => ({
      now,
      crewId,
      today,
      week,
      stats,
      recent,
      crewWeek,
      stateOf,
      isDone,
      complete,
      undo,
      addWater,
      recordPvt,
      lastGain,
      newBadge,
      clearNewBadge: () => setNewBadge(null),
      reminders,
      snooze,
      notificationsOn,
      enableNotifications,
      demoHour,
      setDemoHour,
    }),
    [now, crewId, today, week, stats, recent, crewWeek, stateOf, isDone, complete, undo, addWater, recordPvt, lastGain, newBadge, reminders, snooze, notificationsOn, enableNotifications, demoHour, setDemoHour],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useRoutine(): RoutineApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRoutine must be used inside <RoutineProvider>')
  return c
}

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]))
