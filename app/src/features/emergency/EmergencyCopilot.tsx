import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, Square } from 'lucide-react'
import { askAssistant, failureText, type ChatTurn, type ProposedAction } from '../../ai/client'
import { routeOffline } from '../../ai/fallback'
import { useSpeechInput } from '../../ai/useSpeechInput'
import { PROTOCOLS } from '../../content/emergency'
import { speak } from './tools'

export interface CopilotProps {
  /** App state the AI needs (environment, patient, current step, recent log). */
  context: unknown
  /** Id of the step currently on screen (proposals for an older step are refused). */
  currentNodeId: string | null
  /** Kind of the current step, to check a proposed answer fits it. */
  currentKind: 'ask' | 'do' | 'end' | null
  voice: boolean
  onChooseProtocol: (id: string, reason: string) => void
  onAnswer: (answer: 'yes' | 'no' | 'done', reason: string) => void
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

const title = (id: string) => PROTOCOLS.find((p) => p.id === id)?.title ?? id

/**
 * "Describe what's happening" — free text or voice. The AI replies in one or two sentences and
 * *proposes* actions; nothing changes until the rescuer taps Confirm.
 */
export function EmergencyCopilot(p: CopilotProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [reply, setReply] = useState<{ text: string; tone: 'ai' | 'warn' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  let key = suggestions.length

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    setBusy(true)
    p.onLog(`Rescuer said: “${t}”`)
    const msgs: ChatTurn[] = [...history, { role: 'user', text: t }]
    const r = await askAssistant('emergency', msgs, p.context)
    setBusy(false)

    if (!r.ok) {
      // Offline fallback: keyword routing to a guide, still needing confirmation.
      const id = p.currentNodeId ? null : routeOffline(t)
      setReply({ text: failureText(r) + (id ? ` Best match: ${title(id)}.` : ''), tone: 'warn' })
      if (id) setSuggestions((s) => [...s, { key: ++key, action: { name: 'choose_protocol', args: { protocol_id: id, reason: 'Keyword match (offline)' } }, nodeId: null, state: 'pending' }])
      return
    }

    setHistory([...msgs, { role: 'model', text: r.text || '(action proposed)' }])
    if (r.text) {
      setReply({ text: r.text, tone: 'ai' })
      speak(r.text, p.voice)
    }
    const fresh: Suggestion[] = []
    for (const a of r.actions) {
      if (a.name === 'log_event' && typeof a.args.text === 'string') {
        p.onLog(`AI noted: ${a.args.text}`) // low risk — recorded straight away, clearly labelled
        continue
      }
      fresh.push({ key: ++key, action: a, nodeId: p.currentNodeId, state: 'pending' })
    }
    setSuggestions((s) => [...s.map((x) => (x.state === 'pending' ? { ...x, state: 'stale' as const } : x)), ...fresh])
  }

  const confirm = (s: Suggestion) => {
    const a = s.action
    const reason = String(a.args.reason ?? '')
    if (a.name === 'choose_protocol') p.onChooseProtocol(String(a.args.protocol_id), reason)
    if (a.name === 'answer_step') {
      if (s.nodeId !== p.currentNodeId) {
        setSuggestions((all) => all.map((x) => (x.key === s.key ? { ...x, state: 'stale' } : x)))
        return
      }
      p.onAnswer(a.args.answer as 'yes' | 'no' | 'done', reason)
    }
    if (a.name === 'send_consult') p.onConsult(String(a.args.summary ?? ''))
    setSuggestions((all) => all.map((x) => (x.key === s.key ? { ...x, state: 'done' } : x)))
  }

  const speech = useSpeechInput((t) => void send(t))
  const pending = suggestions.filter((s) => s.state === 'pending')

  const label = (a: ProposedAction) => {
    if (a.name === 'choose_protocol') return `Start: ${title(String(a.args.protocol_id))}`
    if (a.name === 'answer_step') {
      const ans = String(a.args.answer)
      return `Answer: ${ans === 'done' ? 'Done' : ans === 'yes' ? 'Yes' : 'No'}`
    }
    if (a.name === 'send_consult') return 'Send consult to the ground'
    return a.name
  }
  const fits = (s: Suggestion) => {
    if (s.action.name !== 'answer_step') return true
    const ans = s.action.args.answer
    return (p.currentKind === 'ask' && (ans === 'yes' || ans === 'no')) || (p.currentKind === 'do' && ans === 'done')
  }

  return (
    <section className="mb-5 rounded-2xl border border-accent/30 bg-accent/[0.05] p-3" aria-label="AI copilot">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="flex gap-2"
      >
        <input
          value={speech.listening ? speech.interim || 'Listening…' : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what’s happening, in your own words…"
          className="min-h-14 flex-1 rounded-xl border border-white/15 bg-space-900 px-4 text-lg outline-none placeholder:text-ink-dim focus:border-accent"
          aria-label="Describe what is happening"
          disabled={speech.listening}
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className={`min-h-14 min-w-14 rounded-xl border text-xl ${speech.listening ? 'border-warning bg-warning/20 text-warning' : 'border-white/15 hover:bg-white/5'}`}
            aria-label={speech.listening ? 'Stop listening' : 'Speak'}
            title="Push to talk"
          >
            {speech.listening ? <Square className="mx-auto h-5 w-5 fill-current" aria-hidden /> : <Mic className="mx-auto h-6 w-6" aria-hidden />}
          </button>
        )}
        <button type="submit" disabled={busy || !input.trim()} className="min-h-14 rounded-xl bg-accent px-5 text-lg font-bold text-space-950 disabled:opacity-40">
          {busy ? '…' : 'Ask'}
        </button>
      </form>
      {speech.error && <p className="mt-1 text-xs text-caution">{speech.error}</p>}

      <AnimatePresence>
        {reply && (
          <motion.p
            key={reply.text}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 text-lg leading-snug ${reply.tone === 'warn' ? 'text-caution' : ''}`}
          >
            <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-accent">{reply.tone === 'warn' ? 'Offline' : 'AI'}</span>
            {reply.text}
          </motion.p>
        )}
      </AnimatePresence>

      {pending.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {pending.map((s) => (
            <div key={s.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-space-900/80 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent">AI suggests — you decide</div>
                <div className="text-lg font-bold">{label(s.action)}</div>
                {typeof s.action.args.reason === 'string' && <div className="text-sm text-ink-dim">“{s.action.args.reason}”</div>}
                {!fits(s) && <div className="text-sm text-caution">Doesn’t fit the current step — check before confirming.</div>}
              </div>
              <button onClick={() => confirm(s)} disabled={!fits(s)} className="min-h-12 rounded-xl bg-accent px-5 font-bold text-space-950 disabled:opacity-40">
                Confirm
              </button>
              <button
                onClick={() => setSuggestions((all) => all.map((x) => (x.key === s.key ? { ...x, state: 'dismissed' } : x)))}
                className="min-h-12 rounded-xl border border-white/15 px-4"
              >
                Ignore
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-ink-dim">AI suggestions are checked against HALO’s step-by-step guide. You confirm every action. Prototype — Claude Haiku.</p>
    </section>
  )
}
