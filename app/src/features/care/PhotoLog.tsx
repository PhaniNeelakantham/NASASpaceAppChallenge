import { inl, ToneIcon } from '../../components/ToneIcon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Sparkles, X } from 'lucide-react'
import { askAssistant, failureText } from '../../ai/client'
import { DAY_MS, relTime, uid, useCrewStore } from '../../state/crewStore'
import { usePersistentState } from '../../state/persist'

// Skin & rash photo log: one photo a day of the same spot, compared side by side.

const AREAS = ['Face', 'Neck', 'Chest', 'Back', 'Left arm', 'Right arm', 'Hands', 'Legs', 'Feet', 'Other'] as const

interface Photo {
  id: string
  at: number
  area: string
  note: string
  /** Approximate size in mm, if the astronaut measured it. */
  sizeMm?: number
  img: string
}

/** Draws a simulated rash so the demo has a history to compare (no real patient photos). */
function drawRash(size: number, seed: number): string {
  const c = document.createElement('canvas')
  c.width = 360
  c.height = 270
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 360, 270)
  bg.addColorStop(0, '#d9a07e')
  bg.addColorStop(1, '#c98d6b')
  g.fillStyle = bg
  g.fillRect(0, 0, 360, 270)
  let s = seed
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(120,70,50,${r() * 0.08})`
    g.fillRect(r() * 360, r() * 270, 2, 2)
  }
  const blobs = Math.round(size * 1.6)
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * size * 4.2
    const x = 180 + Math.cos(a) * d
    const y = 135 + Math.sin(a) * d * 0.8
    const rad = 4 + r() * 9
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, 'rgba(190,40,45,0.75)')
    grad.addColorStop(1, 'rgba(190,40,45,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, rad, 0, Math.PI * 2)
    g.fill()
  }
  // Ruler for scale, as crews are trained to include.
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.fillRect(20, 240, 160, 14)
  g.fillStyle = '#222'
  for (let i = 0; i <= 16; i++) g.fillRect(20 + i * 10, 240, 1, i % 5 === 0 ? 10 : 5)
  g.font = '10px monospace'
  g.fillText('0', 22, 262)
  g.fillText('80 mm', 150, 262)
  return c.toDataURL('image/jpeg', 0.7)
}

type Level = 'same' | 'watch' | 'show_cmo'
interface AiCompare {
  level: Level
  text: string
  at: number
}

const LEVEL_UI: Record<Level, { label: string; cls: string }> = {
  same: { label: 'Looks the same or better', cls: 'border-nominal/40 bg-nominal/10 text-nominal' },
  watch: { label: 'Keep watching', cls: 'border-caution/40 bg-caution/10 text-caution' },
  show_cmo: { label: 'Show your Crew Medical Officer', cls: 'border-warning/40 bg-warning/10 text-warning' },
}

const describe = (p: Photo, which: string) =>
  `${which} photo: ${p.area}, taken ${relTime(p.at)}, size ${p.sizeMm ? `${p.sizeMm} mm` : 'not measured'}${p.note ? `, note: "${p.note}"` : ''}.`

/** Splits Claude's reply into the level line and the explanation. */
function parseCompare(text: string): Omit<AiCompare, 'at'> {
  const m = /LEVEL:\s*(same|watch|show_cmo)/i.exec(text)
  const level = (m?.[1].toLowerCase() as Level | undefined) ?? 'watch'
  return { level, text: text.replace(/^.*LEVEL:.*$/im, '').trim() || 'No details given.' }
}

function seedPhotos(crewId: string): Photo[] {
  if (crewId !== 'c2') return []
  return [] // generated in the browser on first load (needs a canvas)
}

export function PhotoLog({ crewId }: { crewId: string }) {
  const [photos, setPhotos, failed] = useCrewStore<Photo[]>('photos', crewId, seedPhotos)
  const [capturing, setCapturing] = useState(false)
  const [area, setArea] = useState<string>('Chest')
  const [note, setNote] = useState('')
  const [size, setSize] = useState('')
  const [compareArea, setCompareArea] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [camError, setCamError] = useState('')
  const [aiResults, setAiResults] = usePersistentState<Record<string, AiCompare>>(`halo.skinAi.${crewId}`, {})
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')

  // Demo story: the Crew Medical Officer's rash appeared yesterday and is spreading today.
  useEffect(() => {
    if (crewId === 'c2' && photos.length === 0 && !localStorage.getItem('halo.photos.seeded.c2')) {
      const now = Date.now()
      setPhotos([
        { id: 'seed1', at: now - DAY_MS, area: 'Chest', note: 'Small red patch, itchy', sizeMm: 22, img: drawRash(3, 7) },
        { id: 'seed2', at: now - 2 * 3_600_000, area: 'Chest', note: 'Bigger, with fever today', sizeMm: 41, img: drawRash(6.5, 7) },
      ])
      try {
        localStorage.setItem('halo.photos.seeded.c2', '1')
      } catch {
        /* ignore */
      }
    }
  }, [crewId, photos.length, setPhotos])

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), [])

  const startCamera = async () => {
    setCamError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      stream.current = s
      setCapturing(true)
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s
          void video.current.play()
        }
      })
    } catch {
      setCamError('Camera not available. Use “Upload photo” instead.')
    }
  }

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setCapturing(false)
  }

  const save = (img: string) => {
    const n = Number(size)
    setPhotos((p) => [...p, { id: uid(), at: Date.now(), area, note, sizeMm: n > 0 ? n : undefined, img }].slice(-40))
    setNote('')
    setSize('')
    setCompareArea(area)
  }

  const shrink = (src: CanvasImageSource, w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = 360
    c.height = Math.round((360 * h) / w)
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.72)
  }

  const snap = () => {
    const v = video.current
    if (!v) return
    save(shrink(v, v.videoWidth, v.videoHeight))
    stopCamera()
  }

  const upload = (f: File | undefined) => {
    if (!f) return
    const img = new Image()
    img.onload = () => save(shrink(img, img.width, img.height))
    img.src = URL.createObjectURL(f)
  }

  const byArea = useMemo(() => {
    const m = new Map<string, Photo[]>()
    for (const p of [...photos].sort((a, b) => a.at - b.at)) m.set(p.area, [...(m.get(p.area) ?? []), p])
    return m
  }, [photos])
  const cmp = compareArea ? byArea.get(compareArea) : [...byArea.values()][0]
  const first = cmp?.[0]
  const last = cmp?.[cmp.length - 1]
  const growth = first?.sizeMm && last?.sizeMm && first !== last ? last.sizeMm / first.sizeMm : null

  const pairKey = first && last && first !== last ? `${first.id}:${last.id}` : null
  const ai = pairKey ? aiResults[pairKey] : undefined

  const compareWithAi = async () => {
    if (!first || !last || !pairKey) return
    setAiBusy(true)
    setAiError('')
    const r = await askAssistant(
      'skin',
      [{ role: 'user', text: `${describe(first, 'Earlier')}\n${describe(last, 'Later')}\nCompare the two photos.` }],
      { area: first.area, photosOfThisArea: cmp?.length ?? 2 },
      [
        { label: `Earlier photo (${relTime(first.at)}):`, dataUrl: first.img },
        { label: `Later photo (${relTime(last.at)}):`, dataUrl: last.img },
      ],
    )
    setAiBusy(false)
    if (!r.ok) return setAiError(failureText(r).replace('The step-by-step guide still works.', 'The size comparison above still works.'))
    setAiResults((all) => ({ ...all, [pairKey]: { ...parseCompare(r.text), at: Date.now() } }))
  }

  const field = 'min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-accent/60'

  return (
    <div className="flex flex-col gap-4">
      <div className="glass flex flex-col gap-3 p-4">
        <div className="section-h !mb-0">New photo</div>
        <p className="text-xs text-ink-dim">Same spot, same distance, good light. Put a ruler next to it so size can be compared.</p>
        <div className="flex flex-wrap gap-2">
          <select value={area} onChange={(e) => setArea(e.target.value)} className={field} aria-label="Body area">
            {AREAS.map((a) => (
              <option key={a} className="bg-space-900">
                {a}
              </option>
            ))}
          </select>
          <input value={size} onChange={(e) => setSize(e.target.value)} inputMode="numeric" placeholder="Size mm" className={`${field} w-28`} aria-label="Size in millimetres" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note: itchy? painful? spreading?" className={`${field} min-w-40 flex-1`} />
        </div>
        {capturing ? (
          <div className="flex flex-col gap-2">
            <video ref={video} muted playsInline className="aspect-[4/3] w-full max-w-md rounded-xl bg-black object-cover" />
            <div className="flex gap-2">
              <button onClick={stopCamera} className="min-h-11 flex-1 rounded-lg bg-space-800 text-sm">
                Cancel
              </button>
              <button onClick={snap} className="min-h-11 flex-[2] rounded-lg bg-accent text-sm font-semibold text-space-950">
                <Camera className={inl} /> Take photo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={startCamera} className="min-h-11 flex-1 rounded-lg bg-accent text-sm font-semibold text-space-950">
              <Camera className={inl} /> Use camera
            </button>
            <button onClick={() => fileInput.current?.click()} className="min-h-11 flex-1 rounded-lg bg-space-800 text-sm">
              Upload photo
            </button>
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        )}
        {camError && <p className="text-xs text-caution"><ToneIcon tone="caution" /> {camError}</p>}
        {failed && <p className="text-xs text-caution"><ToneIcon tone="caution" /> Storage is full. Delete old photos to save new ones.</p>}
      </div>

      {cmp && first && last && (
        <div className="glass flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-h !mb-0 flex-1">Compare · {first.area}</span>
            {[...byArea.keys()].map((a) => (
              <button key={a} onClick={() => setCompareArea(a)} className={`min-h-9 rounded-full border px-3 text-xs ${(compareArea ?? first.area) === a ? 'border-accent text-accent' : 'border-white/10 text-ink-dim'}`}>
                {a} · {byArea.get(a)!.length}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[first, last].map((p, i) => (
              <figure key={p.id + i} className="flex flex-col gap-1">
                <img src={p.img} alt={`${p.area} ${relTime(p.at)}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
                <figcaption className="text-xs">
                  <span className="font-mono text-ink-dim">{i === 0 ? 'First' : 'Latest'} · {relTime(p.at)}</span>
                  {p.sizeMm && <span className="ml-2 font-mono">{p.sizeMm} mm</span>}
                  {p.note && <div className="text-ink-dim">{p.note}</div>}
                </figcaption>
              </figure>
            ))}
          </div>
          {first === last && <p className="text-xs text-ink-dim">Take another photo tomorrow to compare.</p>}
          {growth !== null && (
            <p className={`rounded-lg p-2 text-sm ${growth >= 1.3 ? 'bg-warning/10 text-warning' : growth > 1 ? 'bg-caution/10 text-caution' : 'bg-nominal/10 text-nominal'}`}>
              {growth >= 1.3
                ? <><ToneIcon tone="warning" /> {`Spreading: ${Math.round((growth - 1) * 100)} % larger. A spreading rash, especially with fever, should go to the Crew Medical Officer. In space it can be a sign of a reactivated virus.`}</>
                : growth > 1
                  ? <><ToneIcon tone="caution" /> Slightly larger ({Math.round((growth - 1) * 100)} %). Keep photographing daily.</>
                  : <><ToneIcon tone="nominal" /> Same size or smaller. Keep it clean and keep checking.</>}
            </p>
          )}
          {pairKey && (
            <div className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/[0.05] p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">HALO photo check · AI</span>
                {ai && (
                  <button onClick={() => void compareWithAi()} disabled={aiBusy} className="min-h-9 rounded-lg px-2 text-xs text-ink-dim hover:text-ink disabled:opacity-40">
                    Check again
                  </button>
                )}
              </div>
              {!ai && !aiBusy && (
                <>
                  <p className="text-xs text-ink-dim">HALO looks at the first and latest photo and tells you what changed and whether to show your Crew Medical Officer.</p>
                  <button onClick={() => void compareWithAi()} className="min-h-11 rounded-lg bg-accent text-sm font-semibold text-space-950">
                    Compare these photos with HALO
                  </button>
                </>
              )}
              {aiBusy && <p className="animate-pulse text-sm text-ink-dim">HALO is comparing the photos…</p>}
              {ai && !aiBusy && (
                <>
                  <div className={`self-start rounded-full border px-3 py-1 text-sm font-semibold ${LEVEL_UI[ai.level].cls}`}><ToneIcon tone={ai.level === 'same' ? 'nominal' : ai.level === 'watch' ? 'caution' : 'warning'} /> {LEVEL_UI[ai.level].label}</div>
                  <p className="whitespace-pre-line text-sm leading-snug">{ai.text}</p>
                  <p className="font-mono text-[10px] text-ink-dim">Checked {relTime(ai.at)}</p>
                </>
              )}
              {aiError && <p className="text-xs text-caution"><ToneIcon tone="caution" /> {aiError}</p>}
              <p className="text-[11px] text-ink-dim">Prototype: AI change tracking (Claude), not a diagnosis. Photos are sent to the AI only when you press the button. A flight version would run a trained model on board.</p>
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cmp.map((p) => (
              <div key={p.id} className="relative shrink-0">
                <img src={p.img} alt="" className="h-16 w-20 rounded-lg object-cover" />
                <button
                  onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
                  className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] text-ink-dim hover:text-warning"
                  aria-label="Delete photo"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {photos.length === 0 && <p className="text-sm text-ink-dim">No photos yet. Photograph any rash, bruise, cut or pressure mark so you can see if it changes.</p>}
    </div>
  )
}
