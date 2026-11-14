// Fingertip photoplethysmography (PPG) from a camera.
// Each heartbeat pushes a little more blood into the fingertip, which makes the image
// slightly darker. We track the average red brightness over time and find its rhythm.

export interface Sample {
  t: number // ms
  v: number // mean red brightness 0–255
}

const FS = 30 // resample rate, Hz

function movingAverage(x: number[], w: number): number[] {
  const out = new Array<number>(x.length)
  let sum = 0
  const half = Math.floor(w / 2)
  const pre: number[] = [0]
  for (const v of x) pre.push((sum += v))
  for (let i = 0; i < x.length; i++) {
    const a = Math.max(0, i - half)
    const b = Math.min(x.length, i + half + 1)
    out[i] = (pre[b] - pre[a]) / (b - a)
  }
  return out
}

/** Resample to a fixed rate, remove slow drift and smooth noise. Returns the pulse wave. */
export function pulseWave(samples: Sample[]): number[] {
  if (samples.length < 2) return []
  const t0 = samples[0].t
  const t1 = samples[samples.length - 1].t
  const n = Math.floor(((t1 - t0) / 1000) * FS)
  const out: number[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const t = t0 + (i * 1000) / FS
    while (j < samples.length - 2 && samples[j + 1].t < t) j++
    const a = samples[j]
    const b = samples[j + 1]
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
    out.push(a.v + (b.v - a.v) * f)
  }
  const trend = movingAverage(out, FS) // ~1 s
  const detrended = out.map((v, i) => trend[i] - v) // invert: more blood = darker = peak
  return movingAverage(detrended, 5)
}

/**
 * Estimate heart rate by autocorrelation within 40–180 bpm.
 * `quality` is the normalised correlation at the chosen lag (0–1); below ~0.3 the reading is unreliable.
 */
export function estimateBpm(samples: Sample[]): { bpm: number; quality: number } | null {
  const x = pulseWave(samples)
  if (x.length < FS * 5) return null
  const mean = x.reduce((s, v) => s + v, 0) / x.length
  const y = x.map((v) => v - mean)
  const energy = y.reduce((s, v) => s + v * v, 0)
  if (energy === 0) return null
  const minLag = Math.round((FS * 60) / 180)
  const maxLag = Math.round((FS * 60) / 40)
  const r: number[] = []
  for (let lag = 0; lag <= maxLag; lag++) {
    let s = 0
    for (let i = 0; i + lag < y.length; i++) s += y[i] * y[i + lag]
    r.push(s / energy)
  }
  // First strong local maximum avoids picking a multiple of the true period.
  let best = -1
  let bestVal = -Infinity
  for (let lag = minLag; lag < maxLag; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > bestVal) {
      bestVal = r[lag]
      best = lag
    }
  }
  if (best < 0) return null
  for (let lag = minLag; lag < best; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > 0.85 * bestVal) {
      best = lag
      bestVal = r[lag]
      break
    }
  }
  // Parabolic interpolation for sub-sample precision.
  const a = r[best - 1]
  const b = r[best]
  const c = r[best + 1]
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0
  const period = (best + Math.max(-0.5, Math.min(0.5, shift))) / FS
  return { bpm: Math.round(60 / period), quality: Math.max(0, Math.min(1, bestVal)) }
}
