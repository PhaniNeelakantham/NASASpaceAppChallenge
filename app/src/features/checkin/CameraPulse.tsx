import { useEffect, useRef, useState } from 'react'
import { estimateBpm, pulseWave, type Sample } from './pulse'

const DURATION_MS = 20_000
const MIN_QUALITY = 0.35

type Phase = 'starting' | 'place' | 'measuring' | 'done' | 'error'

/**
 * Measures pulse with the camera: cover the lens with a fingertip, keep still for 20 s.
 * Experimental — a check against the Bio-Monitor, not a medical device.
 */
export function CameraPulse({ onResult, onCancel, onRetry }: { onResult: (bpm: number) => void; onCancel: () => void; onRetry: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const wave = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [live, setLive] = useState<{ bpm: number; quality: number } | null>(null)
  const [result, setResult] = useState<{ bpm: number; quality: number } | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const samples: Sample[] = []
    let start = 0
    let lastEstimate = 0
    const grab = document.createElement('canvas')
    grab.width = 40
    grab.height = 30
    const ctx = grab.getContext('2d', { willReadFrequently: true })

    const drawWave = () => {
      const c = wave.current
      const g = c?.getContext('2d')
      if (!c || !g) return
      const w = pulseWave(samples.slice(-200)).slice(-120)
      g.clearRect(0, 0, c.width, c.height)
      if (w.length < 2) return
      const max = Math.max(...w.map(Math.abs)) || 1
      g.strokeStyle = '#ff5a4e'
      g.lineWidth = 2
      g.shadowColor = '#ff5a4e'
      g.shadowBlur = 6
      g.beginPath()
      w.forEach((v, i) => {
        const x = (i / (w.length - 1)) * c.width
        const y = c.height / 2 - (v / max) * (c.height * 0.4)
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      })
      g.stroke()
    }

    const loop = () => {
      if (stopped) return
      raf = requestAnimationFrame(loop)
      const v = video.current
      if (!v || !ctx || v.readyState < 2) return
      ctx.drawImage(v, 0, 0, grab.width, grab.height)
      const px = ctx.getImageData(10, 8, 20, 14).data
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < px.length; i += 4) {
        r += px[i]
        g += px[i + 1]
        b += px[i + 2]
      }
      const n = px.length / 4
      r /= n
      g /= n
      b /= n
      // A fingertip over the lens looks red and fairly uniform; open view does not.
      const covered = r > 25 && r > 1.6 * g && r > 1.6 * b
      const t = performance.now()
      if (!covered) {
        if (samples.length) samples.length = 0
        start = 0
        setPhase((p) => (p === 'done' ? p : 'place'))
        setProgress(0)
        setLive(null)
        return
      }
      if (!start) {
        start = t
        setPhase('measuring')
      }
      samples.push({ t, v: r })
      setProgress(Math.min(1, (t - start) / DURATION_MS))
      drawWave()
      if (t - lastEstimate > 1000 && t - start > 6000) {
        lastEstimate = t
        setLive(estimateBpm(samples.filter((s) => s.t > t - 8000)))
      }
      if (t - start >= DURATION_MS) {
        stopped = true
        setResult(estimateBpm(samples))
        setPhase('done')
        stream?.getTracks().forEach((tr) => tr.stop())
      }
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((tr) => tr.stop())
        stream = s
        // Turn on the phone torch if there is one (laptop webcams ignore this).
        const track = s.getVideoTracks()[0]
        void track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }).catch(() => {})
        if (video.current) {
          video.current.srcObject = s
          void video.current.play()
        }
        setPhase('place')
        raf = requestAnimationFrame(loop)
      })
      .catch(() => {
        setError('Camera not available. Allow camera access in the browser, or enter the value by hand.')
        setPhase('error')
      })
    if (!navigator.mediaDevices) {
      setError('This browser can’t use the camera here. Enter the value by hand.')
      setPhase('error')
    }

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [])

  const good = result && result.quality >= MIN_QUALITY
  const btn = 'min-h-12 flex-1 rounded-lg font-semibold'

  return (
    <div className="glass flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="section-h !mb-0">Camera pulse · experimental</span>
        <button onClick={onCancel} className="font-mono text-xs uppercase tracking-wider text-ink-dim hover:text-ink">
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black">
          <video ref={video} muted playsInline className="h-full w-full object-cover" />
          {phase === 'measuring' && (
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#ff5a4e" strokeWidth="2.5" strokeDasharray={`${progress * 100.5} 100.5`} />
            </svg>
          )}
        </div>
        <div className="flex-1 text-sm">
          {phase === 'starting' && <p className="text-ink-dim">Starting camera…</p>}
          {phase === 'place' && (
            <p>
              <b>Cover the camera completely with your fingertip.</b>{' '}
              <span className="text-ink-dim">Press lightly, sit in a lit area and keep still. Measuring starts automatically.</span>
            </p>
          )}
          {phase === 'measuring' && (
            <p>
              Hold still… <span className="font-mono text-ink-dim">{Math.ceil((1 - progress) * (DURATION_MS / 1000))} s</span>
              {live && live.quality >= MIN_QUALITY && (
                <span className="ml-2 font-mono text-warning">≈ {live.bpm} bpm</span>
              )}
            </p>
          )}
          {phase === 'done' && good && (
            <p>
              Measured <b className="font-mono text-lg">{result.bpm} bpm</b>{' '}
              <span className="text-ink-dim">· signal {Math.round(result.quality * 100)} %</span>
            </p>
          )}
          {phase === 'done' && !good && (
            <p className="text-caution">▲ Signal too weak to trust. Try again with more light and a still finger, or enter it by hand.</p>
          )}
          {phase === 'error' && <p className="text-caution">▲ {error}</p>}
        </div>
      </div>

      <canvas ref={wave} width={480} height={70} className="h-[70px] w-full rounded-lg bg-black/30" aria-label="Live pulse waveform" />

      {phase === 'done' && (
        <div className="flex gap-3">
          <button onClick={onCancel} className={`${btn} bg-space-800 text-ink-dim`}>
            {good ? 'Discard' : 'Close'}
          </button>
          <button onClick={onRetry} className={`${btn} bg-space-800`}>
            Try again
          </button>
          {good && (
            <button onClick={() => onResult(result.bpm)} className={`${btn} flex-[2] bg-accent text-space-950`}>
              Use {result.bpm} bpm
            </button>
          )}
        </div>
      )}
      <p className="text-[11px] text-ink-dim">
        How it works: each heartbeat pushes blood into the fingertip and darkens the image slightly. HALO tracks that rhythm.
        Check against the Bio-Monitor if a reading looks off.
      </p>
    </div>
  )
}
