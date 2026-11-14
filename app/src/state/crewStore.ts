import { useCallback, useEffect, useState } from 'react'

// Tiny persistent store: one localStorage entry per feature, holding a value per crew member
// (or a shared value under the key 'all'). Missing entries fall back to simulated seed data.

function read<T>(name: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(`halo.${name}.v1`)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function write<T>(name: string, all: Record<string, T>): boolean {
  try {
    localStorage.setItem(`halo.${name}.v1`, JSON.stringify(all))
    return true
  } catch {
    return false // storage full or unavailable
  }
}

export const DAY_MS = 86_400_000

/**
 * Returns [value, setValue, saveFailed]. `seed` runs only when nothing is stored yet for `key`.
 * Values written for one key never touch another key's data.
 */
export function useCrewStore<T>(name: string, key: string, seed: (key: string) => T) {
  const [value, setValue] = useState<T>(() => read<T>(name)[key] ?? seed(key))
  const [failed, setFailed] = useState(false)
  const [loadedKey, setLoadedKey] = useState(key)

  // Switching crew member: load that member's data.
  if (loadedKey !== key) {
    setLoadedKey(key)
    setValue(read<T>(name)[key] ?? seed(key))
  }

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        const all = read<T>(name)
        all[key] = v
        setFailed(!write(name, all))
        return v
      })
    },
    [name, key],
  )

  // Keep tabs in sync if the same store changes elsewhere (e.g. another browser tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `halo.${name}.v1`) {
        const v = read<T>(name)[key]
        if (v !== undefined) setValue(v)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [name, key])

  return [value, set, failed] as const
}

export function relTime(at: number, now = Date.now()): string {
  const d = Math.round((now - at) / DAY_MS)
  if (d <= 0) {
    const h = Math.round((now - at) / 3_600_000)
    return h <= 0 ? 'just now' : `${h} h ago`
  }
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
