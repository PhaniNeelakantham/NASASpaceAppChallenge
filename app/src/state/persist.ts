import { useCallback, useEffect, useState } from 'react'

/**
 * Small helpers for remembering progress in this browser (localStorage).
 * Every read/write is wrapped: storage can be blocked (private windows, cleared site data),
 * and the app must still work, it just won't remember.
 */

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

/** Local calendar day, e.g. "2026-11-14", for progress that resets each day. */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * useState that is saved under `key`. When `key` changes (another crew member, a new day),
 * the value for the new key is loaded.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(() => ({ key, value: readJSON(key, initial) }))
  const value = state.key === key ? state.value : readJSON(key, initial)

  useEffect(() => {
    if (state.key !== key) setState({ key, value: readJSON(key, initial) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback(
    (v: T | ((prev: T) => T)) =>
      setState((s) => {
        const cur = s.key === key ? s.value : readJSON(key, initial)
        const next = typeof v === 'function' ? (v as (p: T) => T)(cur) : v
        writeJSON(key, next)
        return { key, value: next }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set]
}
