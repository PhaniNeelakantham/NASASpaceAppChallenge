import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Headphones, Mic, Send, Square } from 'lucide-react'
import { askAssistant, failureText, type ChatTurn, type ProposedAction } from '../../ai/client'
import { routeOffline } from '../../ai/fallback'
import { useSpeechInput } from '../../ai/useSpeechInput'
import { PROTOCOLS } from '../../content/emergency'
import { CREW } from '../../data/syntheticCrew'
import { speak } from './tools'

export interface CopilotProps {
  /** App state the AI needs (environment, crew, patient, current step, recent log). */
  context: unknown
  /** Id of the step currently on screen (proposals for an older step are refused). */
  currentNodeId: string | null
  /** Kind of the current step, to check a proposed answer fits it. */
  currentKind: 'ask' | 'do' | 'end' | null
  hasPatient: boolean
  hasProtocol: boolean
  voice: boolean
  onChoosePatient: (id: string, reason: string) => void
  onChooseProtocol: (id: string, reason: string) => void
  /** Answer proposed by the AI and confirmed by the rescuer. */
  onAnswer: (answer: 'yes' | 'no' | 'done', reason: string) => void
  /** Answer the rescuer said directly ("yes", "no", "done"), same as tapping the button. */
  onDirectAnswer: (answer: 'yes' | 'no' | 'done') => void
  onLog: (text: string) => void
  onConsult: (summary: string) => void
}

interface Suggestion {
  key: number
  action: ProposedAction
  /** Step the proposal was made for. */
  nodeId: string | null
  state: 'pending' | 'done' | 'dismissed' | 'stale'
}

interface Line {
  who: 'you' | 'halo' | 'system'
  text: string
}

const protocolTitle = (id: string) => PROTOCOLS.find((p) => p.id === id)?.title ?? id
const crewTitle = (id: string) => CREW.find((c) => c.id === id)?.name ?? id
const GREETING = 'I’m HALO, and I’m with you. Tell me what happened. Who is hurt and what do you see?'

/** Words handled on the device, with no AI call. */
const norm = (t: string) => t.toLowerCase().replace(/[^a-z ]/g, '').trim()
const CONFIRM = new Set(['confirm', 'yes confirm', 'confirmed', 'do it', 'go ahead', 'accept'])
const DISMISS = new Set(['ignore', 'cancel', 'dismiss', 'no thats wrong', 'wrong'])
const DIRECT: Record<string, 'yes' | 'no' | 'done'> = { yes: 'yes', yeah: 'yes', yep: 'yes', no: 'no', nope: 'no', done: 'done', next: 'done', finished: 'done' }

/**
 * HALO on the line: a spoken or typed conversation with Claude that stays with the rescuer through the
 * whole emergency. Claude coaches each step in its own words and *proposes* changes (patient, guide,
 * answers); nothing changes until the rescuer confirms by tap or by saying "confirm".
 * Hands-free mode keeps the microphone open between turns, for when both hands are on the patient.
 */
export function EmergencyCopilot(p: CopilotProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [lines, setLines] = useState<Line[]>([{ who: 'halo', text: GREETING }])
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [handsFree, setHandsFree] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const keyRef = useRef(0)
  const list = useRef<HTMLDivElement>(null)

  const say = (text: string, who: Line['who'] = 'halo') => {
    setLines((l) => [...l, { who, text }])
    if (who === 'halo') speak(text, p.voice)
  }

  // Greet out loud once.
  useEffect(() => {
    speak(GREETING, p.voice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [lines, busy])

  const setState = (key: number, state: Suggestion['state']) => setSuggestions((all) => all.map((x) => (x.key === key ? { ...x, state } : x)))

  const fits = (s: Suggestion) => {
    const a = s.action
    if (a.name === 'answer_step') {
      const ans = a.args.answer
      return s.nodeId === p.currentNodeId && ((p.currentKind === 'ask' && (ans === 'yes' || ans === 'no')) || (p.currentKind === 'do' && ans === 'done'))
    }
    if (a.name === 'choose_patient') return !p.hasPatient
    if (a.name === 'choose_protocol') return !p.hasProtocol
    return true
  }

  // Only proposals that still fit the screen are shown (a step answered by hand retires the AI's answer).
  const pending = suggestions.filter((s) => s.state === 'pending' && fits(s))

  const confirm = (s: Suggestion) => {
    if (!fits(s)) return setState(s.key, 'stale')
    const a = s.action
    const reason = String(a.args.reason ?? '')
    if (a.name === 'choose_patient') p.onChoosePatient(String(a.args.crew_id), reason)
    if (a.name === 'choose_protocol') p.onChooseProtocol(String(a.args.protocol_id), reason)
    if (a.name === 'answer_step') p.onAnswer(a.args.answer as 'yes' | 'no' | 'done', reason)
    if (a.name === 'send_consult') p.onConsult(String(a.args.summary ?? ''))
    setState(s.key, 'done')
  }

  /** Confirm patient before guide, so the guide starts with the right name. */
  const confirmAll = () => {
    const order = ['choose_patient', 'choose_protocol', 'answer_step', 'send_consult']
    ;[...pending].sort((a, b) => order.indexOf(a.action.name) - order.indexOf(b.action.name)).filter(fits).forEach(confirm)
  }

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    const w = norm(t)

    // Short spoken commands are handled on the device: instant, and no AI call needed.
    if (pending.length && CONFIRM.has(w)) {
      setLines((l) => [...l, { who: 'you', text: t }])
      confirmAll()
      return
    }
    if (pending.length && DISMISS.has(w)) {
      setLines((l) => [...l, { who: 'you', text: t }])
      setSuggestions((all) => all.map((x) => (x.state === 'pending' ? { ...x, state: 'dismissed' as const } : x)))
      say('Okay, ignored. Tell me more.')
      return
    }
    const direct = DIRECT[w]
    if (direct && !pending.length && ((p.currentKind === 'ask' && direct !== 'done') || (p.currentKind === 'do' && direct === 'done'))) {
      setLines((l) => [...l, { who: 'you', text: t }])
      p.onDirectAnswer(direct)
      return
    }

    setLines((l) => [...l, { who: 'you', text: t }])
    setBusy(true)
    p.onLog(`Rescuer said: “${t}”`)
    const msgs: ChatTurn[] = [...history, { role: 'user', text: t }]
    const r = await askAssistant('emergency', msgs, p.context)
    setBusy(false)

    if (!r.ok) {
      // Offline fallback: keyword routing to a guide, still needing confirmation.
      const id = p.hasProtocol ? null : routeOffline(t)
      say(failureText(r) + (id ? ` Best match: ${protocolTitle(id)}.` : ''), 'system')
      if (id) setSuggestions((s) => [...s, { key: ++keyRef.current, action: { name: 'choose_protocol', args: { protocol_id: id, reason: 'Keyword match (offline)' } }, nodeId: null, state: 'pending' }])
      return
    }

    setHistory([...msgs, { role: 'model', text: r.text }])
    say(r.text)
    const fresh: Suggestion[] = []
    for (const a of r.actions) {
      if (a.name === 'log_event' && typeof a.args.text === 'string') {
        p.onLog(`AI noted: ${a.args.text}`) // low risk, recorded straight away, clearly labelled
        continue
      }
      fresh.push({ key: ++keyRef.current, action: a, nodeId: p.currentNodeId, state: 'pending' })
    }
    setSuggestions((s) => [...s.map((x) => (x.state === 'pending' ? { ...x, state: 'stale' as const } : x)), ...fresh])
  }

  const speech = useSpeechInput((t) => void send(t))

  // Track speaking, and in hands-free mode reopen the mic whenever HALO is quiet and idle.
  const live = useRef({ handsFree, busy, speech })
  live.current = { handsFree, busy, speech }
  useEffect(() => {
    const t = setInterval(() => {
      const talking = !!window.speechSynthesis?.speaking
      setSpeaking(talking)
      const l = live.current
      if (l.handsFree && !l.busy && !talking && !l.speech.listening) l.speech.start()
    }, 500)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (speech.error) setHandsFree(false)
  }, [speech.error])

  const status = speech.listening ? 'Listening…' : busy ? 'Thinking…' : speaking ? 'Speaking' : handsFree ? 'Hands-free on' : 'Tap the mic or type'
  const orb = speech.listening ? 'bg-warning' : busy ? 'bg-caution' : speaking ? 'bg-accent' : 'bg-white/30'

  const label = (a: ProposedAction) => {
    if (a.name === 'choose_patient') return `Patient: ${crewTitle(String(a.args.crew_id))}`
    if (a.name === 'choose_protocol') return `Start guide: ${protocolTitle(String(a.args.protocol_id))}`
    if (a.name === 'answer_step') {
      const ans = String(a.args.answer)
      return `Answer this step: ${ans === 'done' ? 'Done' : ans === 'yes' ? 'Yes' : 'No'}`
    }
    if (a.name === 'send_consult') return 'Send consult to the ground'
    return a.name
  }

  return (
    <section className="mb-5 flex flex-col rounded-2xl border border-accent/30 bg-accent/[0.05] p-3" aria-label="HALO on the line">
      <div className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center" aria-hidden>
          <span className={`absolute inset-0 rounded-full opacity-30 ${orb} ${speech.listening || speaking || busy ? 'animate-ping' : ''}`} />
          <span className={`h-4 w-4 rounded-full ${orb}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">HALO on the line</div>
          <div className="text-sm text-ink-dim" aria-live="polite">
            {status}
          </div>
        </div>
        {speech.supported && (
          <button
            onClick={() => {
              setHandsFree((h) => !h)
              if (handsFree) speech.stop()
            }}
            aria-pressed={handsFree}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${handsFree ? 'border-accent bg-accent/15 text-accent' : 'border-white/15 text-ink-dim hover:text-ink'}`}
            title="Keep the microphone open between turns"
          >
            <Headphones className="h-4 w-4" aria-hidden />
            Hands-free {handsFree ? 'on' : 'off'}
          </button>
        )}
      </div>

      <div ref={list} className="mt-3 flex max-h-64 min-h-24 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
        {lines.map((l, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-3 py-2 text-[17px] leading-snug ${
              l.who === 'you' ? 'self-end bg-white/10' : l.who === 'system' ? 'self-start border border-caution/40 text-caution' : 'self-start bg-accent/10'
            }`}
          >
            {l.text}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl bg-accent/10 px-3 py-2 text-ink-dim">
            <span className="animate-pulse">HALO is thinking…</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex flex-col gap-2">
            {pending.map((s) => (
              <div key={s.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-space-900/80 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-accent">HALO suggests, you decide</div>
                  <div className="text-lg font-bold">{label(s.action)}</div>
                  {typeof s.action.args.reason === 'string' && <div className="text-sm text-ink-dim">“{s.action.args.reason}”</div>}
                </div>
                <button onClick={() => confirm(s)} className="min-h-12 rounded-xl bg-accent px-5 font-bold text-space-950 disabled:opacity-40">
                  Confirm
                </button>
                <button onClick={() => setState(s.key, 'dismissed')} className="min-h-12 rounded-xl border border-white/15 px-4">
                  Ignore
                </button>
              </div>
            ))}
            <p className="text-xs text-ink-dim">Or say “confirm” or “ignore”.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={speech.listening ? speech.interim || 'Listening…' : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell HALO what’s happening…"
          className="min-h-14 min-w-0 flex-1 rounded-xl border border-white/15 bg-space-900 px-4 text-lg outline-none placeholder:text-ink-dim focus:border-accent"
          aria-label="Tell HALO what is happening"
          disabled={speech.listening}
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className={`grid min-h-14 min-w-14 place-items-center rounded-xl border ${speech.listening ? 'border-warning bg-warning/20 text-warning' : 'border-white/15 hover:bg-white/5'}`}
            aria-label={speech.listening ? 'Stop listening' : 'Speak'}
            title="Push to talk"
          >
            {speech.listening ? <Square className="h-5 w-5 fill-current" aria-hidden /> : <Mic className="h-6 w-6" aria-hidden />}
          </button>
        )}
        <button type="submit" disabled={busy || !input.trim()} className="grid min-h-14 min-w-14 place-items-center rounded-xl bg-accent text-space-950 disabled:opacity-40" aria-label="Send">
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </form>
      {speech.error && <p className="mt-1 text-xs text-caution">{speech.error}</p>}
      <p className="mt-2 text-[11px] text-ink-dim">
        “Yes”, “no” and “done” answer the step on screen directly. HALO’s suggestions follow the checked step-by-step guide, and you confirm every one. Prototype: Claude Haiku.
      </p>
    </section>
  )
}
