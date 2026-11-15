import { ToneIcon } from '../../components/ToneIcon'
import { useMemo, useState } from 'react'
import { CREW } from '../../data/syntheticCrew'
import { DAY_MS, relTime, uid, useCrewStore } from '../../state/crewStore'
import { useRoutine } from '../../state/routine'

// Crew buddy check: crewmates rate how each other seem. People often notice changes in a
// teammate (tiredness, withdrawal, irritability) before that person notices in themselves.

const TRAITS = [
  { id: 'energy', label: 'Energy', low: 'Drained', high: 'Energetic' },
  { id: 'mood', label: 'Mood', low: 'Down', high: 'Upbeat' },
  { id: 'focus', label: 'Focus', low: 'Scattered', high: 'Sharp' },
  { id: 'social', label: 'Getting along', low: 'Withdrawn / tense', high: 'Engaged' },
] as const
type TraitId = (typeof TRAITS)[number]['id']
type Ratings = Record<TraitId, number>

interface Rating {
  id: string
  from: string
  to: string
  at: number
  r: Ratings
  note: string
}

const first = (id: string) => `the ${CREW.find((c) => c.id === id)?.name ?? id}`

/** Simulated week: the crew sees the Commander (c1, sleep debt) as tired and unfocused, more than they rate themselves. */
function seedRatings(): Rating[] {
  const now = Date.now()
  const out: Rating[] = []
  let n = 0
  for (const to of CREW) {
    for (const from of CREW) {
      for (const back of [1, 3, 5]) {
        const tired = to.id === 'c1' && back <= 3
        const self = from.id === to.id
        const base: Ratings = { energy: 4, mood: 4, focus: 4, social: 4 }
        if (tired && !self) Object.assign(base, { energy: 2, focus: 2, mood: 3 })
        if (tired && self) Object.assign(base, { energy: 3, focus: 4, mood: 4 })
        if ((n++ * 7) % 5 === 0) base.mood = Math.max(1, base.mood - 1)
        out.push({ id: `seed${n}`, from: from.id, to: to.id, at: now - back * DAY_MS, r: base, note: '' })
      }
    }
  }
  return out
}

function avg(rs: Rating[], t: TraitId) {
  return rs.length ? rs.reduce((s, x) => s + x.r[t], 0) / rs.length : null
}

export function BuddyCheck({ crewId }: { crewId: string }) {
  const [all, setAll] = useCrewStore<Rating[]>('buddy', 'all', seedRatings)
  const { complete } = useRoutine()
  const others = CREW.filter((c) => c.id !== crewId)
  const [to, setTo] = useState(others[0].id)
  const [r, setR] = useState<Ratings>({ energy: 3, mood: 3, focus: 3, social: 3 })
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const target = others.some((o) => o.id === to) ? to : others[0].id

  const week = Date.now() - 7 * DAY_MS
  const aboutMe = useMemo(() => all.filter((x) => x.to === crewId && x.at > week), [all, crewId, week])
  const fromCrew = aboutMe.filter((x) => x.from !== crewId)
  const fromSelf = aboutMe.filter((x) => x.from === crewId)
  const gaps = TRAITS.map((t) => ({ t, crew: avg(fromCrew, t.id), self: avg(fromSelf, t.id) })).filter(
    (g) => g.crew !== null && g.self !== null && g.self - g.crew >= 1,
  )

  // Crew-wide: who might need a hand this week (lowest average from others).
  const concerns = CREW.map((c) => {
    const rs = all.filter((x) => x.to === c.id && x.from !== c.id && x.at > week)
    const score = rs.length ? TRAITS.reduce((s, t) => s + (avg(rs, t.id) ?? 0), 0) / TRAITS.length : null
    return { c, score }
  }).filter((x) => x.score !== null && x.score < 3.4)

  const submit = (self: boolean) => {
    const toId = self ? crewId : target
    setAll((a) => [...a, { id: uid(), from: crewId, to: toId, at: Date.now(), r, note }].slice(-400))
    setSent(self ? 'yourself' : first(toId))
    setNote('')
    setR({ energy: 3, mood: 3, focus: 3, social: 3 })
    if (!self) complete('buddy', 'weekly')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass flex flex-col gap-3 p-4">
        <div className="section-h !mb-0">Check on a crewmate</div>
        <div className="flex flex-wrap gap-2">
          {others.map((o) => (
            <button
              key={o.id}
              onClick={() => setTo(o.id)}
              className={`min-h-11 rounded-lg px-3 text-sm ${target === o.id ? 'bg-accent font-semibold text-space-950' : 'bg-space-800 text-ink-dim'}`}
              aria-pressed={target === o.id}
            >
              {o.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-dim">How has {first(target)} seemed over the last day or two? Be honest. Only the Crew Medical Officer sees individual answers.</p>
        {TRAITS.map((t) => (
          <div key={t.id}>
            <div className="flex justify-between text-sm">
              <span>{t.label}</span>
              <span className="font-mono text-accent">{r[t.id]}/5</span>
            </div>
            <input type="range" min={1} max={5} value={r[t.id]} onChange={(e) => setR({ ...r, [t.id]: Number(e.target.value) })} className="h-9 w-full accent-[var(--color-accent)]" aria-label={t.label} />
            <div className="flex justify-between font-mono text-[10px] text-ink-dim">
              <span>{t.low}</span>
              <span>{t.high}</span>
            </div>
          </div>
        ))}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything you noticed? (optional)"
          className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-accent/60"
        />
        <div className="flex gap-2">
          <button onClick={() => submit(true)} className="min-h-11 flex-1 rounded-lg bg-space-800 text-sm">
            Rate myself instead
          </button>
          <button onClick={() => submit(false)} className="min-h-11 flex-[2] rounded-lg bg-accent text-sm font-semibold text-space-950">
            Send check on {first(target)}
          </button>
        </div>
        {sent && <p className="text-xs text-nominal"><ToneIcon tone="nominal" /> Saved your check on {sent}. Thanks for looking out for the crew.</p>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="glass flex flex-col gap-3 p-4">
          <div className="section-h !mb-0">How the crew sees you · last 7 days</div>
          {TRAITS.map((t) => {
            const c = avg(fromCrew, t.id)
            const s = avg(fromSelf, t.id)
            return (
              <div key={t.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{t.label}</span>
                  <span className="font-mono text-xs text-ink-dim">
                    crew {c?.toFixed(1) ?? '–'} · you {s?.toFixed(1) ?? '–'}
                  </span>
                </div>
                <div className="relative mt-1 h-2 rounded bg-white/[0.06]">
                  {c !== null && <div className="absolute inset-y-0 left-0 rounded bg-accent/70" style={{ width: `${(c / 5) * 100}%` }} />}
                  {s !== null && <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${(s / 5) * 100}%` }} title="Your own rating" />}
                </div>
              </div>
            )
          })}
          <p className="font-mono text-[10px] text-ink-dim">Bar = crew average · line = your own rating · {fromCrew.length} checks from crewmates</p>
          {gaps.length > 0 ? (
            <p className="rounded-lg bg-caution/10 p-3 text-sm text-caution">
              <ToneIcon tone="caution" /> Your crew rates your {gaps.map((g) => g.t.label.toLowerCase()).join(' and ')} lower than you do. That gap is common with sleep debt and stress; people
              notice before we do. Check your sleep, and consider a private chat with the Crew Medical Officer.
            </p>
          ) : (
            <p className="rounded-lg bg-nominal/10 p-3 text-sm text-nominal"><ToneIcon tone="nominal" /> The crew’s view matches yours.</p>
          )}
        </div>
        <div className="glass p-4">
          <div className="section-h">Crew pulse</div>
          {concerns.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {concerns.map(({ c, score }) => (
                <li key={c.id}>
                  <ToneIcon tone="caution" /> <b>{c.name}</b> seems lower this week ({score!.toFixed(1)}/5). A meal together or a check-in chat can help.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-dim">Everyone seems OK this week.</p>
          )}
          <p className="mt-2 font-mono text-[10px] text-ink-dim">
            Last check: {all.length ? relTime(Math.max(...all.map((x) => x.at))) : 'never'}
          </p>
        </div>
      </div>
    </div>
  )
}
