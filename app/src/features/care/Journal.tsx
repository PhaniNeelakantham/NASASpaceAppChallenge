import { inl, ToneIcon } from '../../components/ToneIcon'
import { Lock, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DAY_MS, relTime, uid, useCrewStore } from '../../state/crewStore'
import { ENVIRONMENTS, formatCountdown, formatDelay, type EnvironmentId } from '../../state/mission'
import { useRoutine } from '../../state/routine'

// Private mood journal + "Earth window": the countdown to the next scheduled call home.
// Isolation and distance from Earth are two of NASA's five spaceflight hazards.

interface Entry {
  id: string
  at: number
  mood: number
  text: string
}

interface Sent {
  at: number
  arriveAt: number
}

const PROMPTS = [
  'One thing that went well today…',
  'Something I’m looking forward to…',
  'What’s on my mind right now…',
  'Something I miss about Earth…',
  'Someone on the crew who helped me today…',
]

function seedJournal(crewId: string): Entry[] {
  const now = Date.now()
  if (crewId === 'c1')
    return [
      { id: 'j1', at: now - 4 * DAY_MS, mood: 7, text: 'Docking went perfectly. Proud of the team.' },
      { id: 'j2', at: now - 2 * DAY_MS, mood: 6, text: 'Couldn’t sleep again. The fans are loud.' },
      { id: 'j3', at: now - 1 * DAY_MS, mood: 5, text: 'Tired. Snapped at the Flight Engineer over nothing. Need to apologise.' },
    ]
  return [{ id: 'j1', at: now - 2 * DAY_MS, mood: 7, text: 'Saw the sunrise over the Pacific from the cupola.' }]
}

/** "2d 04h 12m 09s" for long waits, mm:ss when under an hour. */
function longCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  if (t < 3600) return formatCountdown(ms)
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d ? `${d}d ` : ''}${p(h)}h ${p(m)}m ${p(s)}s`
}

/** Next Sunday 18:00 local time: the weekly private family conference. */
function nextFamilyWindow(now: number): number {
  const d = new Date(now)
  const target = new Date(d)
  target.setHours(18, 0, 0, 0)
  const add = (7 - d.getDay()) % 7
  target.setDate(d.getDate() + add)
  if (target.getTime() <= now) target.setDate(target.getDate() + 7)
  return target.getTime()
}

export function Journal({ crewId, env }: { crewId: string; env: EnvironmentId }) {
  const [entries, setEntries] = useCrewStore<Entry[]>('journal', crewId, seedJournal)
  const [sent, setSent] = useCrewStore<Sent | null>('earthmsg', crewId, () => null)
  const { complete } = useRoutine()
  const [text, setText] = useState('')
  const [mood, setMood] = useState(6)
  const [prompt, setPrompt] = useState(() => PROMPTS[new Date().getDate() % PROMPTS.length])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const e = ENVIRONMENTS[env]
  const delayed = e.groundAvailable === 'delayed'
  const callAt = nextFamilyWindow(now)
  const moods = [...entries].sort((a, b) => a.at - b.at).slice(-7)
  const falling = moods.length >= 3 && moods[moods.length - 1].mood <= moods[0].mood - 2

  const save = () => {
    if (!text.trim()) return
    setEntries((x) => [...x, { id: uid(), at: Date.now(), mood, text: text.trim() }])
    setText('')
    setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])
    complete('connect')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <div className="glass flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="section-h !mb-0">Private journal</span>
            <span className="font-mono text-[10px] text-ink-dim"><Lock className={inl} /> Stays on this device · never sent to the ground</span>
          </div>
          <textarea
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            placeholder={prompt}
            rows={4}
            className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-accent/60"
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">Mood</span>
            <input type="range" min={1} max={10} value={mood} onChange={(ev) => setMood(Number(ev.target.value))} className="h-9 flex-1 accent-[var(--color-accent)]" aria-label="Mood" />
            <span className="w-10 font-mono text-accent">{mood}/10</span>
            <button onClick={() => setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])} className="min-h-11 rounded-lg bg-space-800 px-3 text-xs text-ink-dim">
              New prompt
            </button>
            <button onClick={save} disabled={!text.trim()} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-space-950 disabled:opacity-40">
              Save entry
            </button>
          </div>
        </div>
        {falling && (
          <p className="rounded-lg bg-caution/10 p-3 text-sm text-caution">
            <ToneIcon tone="caution" /> Your mood has dropped over your last few entries. That’s normal on a long mission, and it helps to talk: a crewmate, a private call with the flight
            psychologist, or your family at the next Earth window.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {[...entries].reverse().map((x) => (
            <li key={x.id} className="glass flex gap-3 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 font-mono text-sm">{x.mood}</span>
              <div className="flex-1">
                <div className="font-mono text-[10px] text-ink-dim">{relTime(x.at)}</div>
                <p className="text-sm">{x.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="glass flex flex-col gap-2 p-4">
          <div className="section-h !mb-0">Earth window</div>
          <div className="text-xs text-ink-dim">Next private family call</div>
          <div className="font-mono text-3xl font-black text-accent">{longCountdown(callAt - now)}</div>
          <div className="text-xs text-ink-dim">
            {new Date(callAt).toLocaleDateString(undefined, { weekday: 'long' })} {new Date(callAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="mt-1 text-sm">
            {!delayed
              ? 'Live two-way video. Signal delay: ' + (e.oneWayDelaySec < 1 ? 'none.' : `${formatDelay(e.oneWayDelaySec)}, barely noticeable.`)
              : `Live calls aren’t possible: a message takes ${formatDelay(e.oneWayDelaySec)} each way. The window is when your recorded messages are sent and theirs arrive.`}
          </p>
        </div>
        {delayed && (
          <div className="glass flex flex-col gap-2 p-4">
            <div className="section-h !mb-0">Message home</div>
            <p className="text-xs text-ink-dim">Record a short video message. It goes out on the next downlink.</p>
            {sent && sent.arriveAt > now ? (
              <p className="text-sm">
                <ToneIcon tone="caution" /> In transit, arrives on Earth in <span className="font-mono text-caution">{longCountdown(sent.arriveAt - now)}</span>
              </p>
            ) : sent ? (
              <p className="text-sm text-nominal"><ToneIcon tone="nominal" /> Delivered {relTime(sent.arriveAt, now)}. A reply can take {formatDelay(e.oneWayDelaySec * 2)} or more.</p>
            ) : null}
            <button
              onClick={() => {
                setSent({ at: Date.now(), arriveAt: Date.now() + e.oneWayDelaySec * 1000 })
                complete('connect')
              }}
              className="min-h-11 rounded-lg bg-accent text-sm font-semibold text-space-950"
            >
              <Video className={inl} /> Record & send message
            </button>
          </div>
        )}
        <div className="glass p-4">
          <div className="section-h">Mood · last entries</div>
          <div className="flex h-16 items-end gap-1">
            {moods.map((m) => (
              <div key={m.id} className="max-w-10 flex-1 rounded-t bg-accent/60" style={{ height: `${m.mood * 10}%` }} title={`${m.mood}/10 · ${relTime(m.at)}`} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
