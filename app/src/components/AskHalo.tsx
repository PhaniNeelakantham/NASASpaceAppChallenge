import { useEffect, useRef, useState } from 'react'
import { ChevronRight, MessageCircle, Mic, Square } from 'lucide-react'
import { askAssistant, failureText, type ChatTurn } from '../ai/client'
import { useSpeechInput } from '../ai/useSpeechInput'
import type { SystemId } from '../types'

export type AppTab = 'checkin' | 'trends' | 'radiation' | 'learn'

interface Props {
  /** What the AI is told about the current screen and the astronaut's data. */
  context: unknown
  onOpenSystem: (id: SystemId) => void
  onEmergency: () => void
  onOpenTab: (tab: AppTab) => void
  /** One-tap example questions for this screen. */
  starters?: string[]
  subtitle?: string
}

interface Msg {
  role: 'user' | 'model' | 'note'
  text: string
}

const DEFAULT_STARTERS = ['Why is my temperature flagged?', 'How do I take my blood pressure in zero g?', 'What should I focus on in this environment?']
const HANDLE_W = 48

/**
 * "Ask HALO" as a pull-out drawer on the right edge: tap the handle and the panel slides out to the
 * left; tap again and it slides back to the right. The parent must be `relative overflow-hidden`.
 */
export function AskHalo({ context, onOpenSystem, onEmergency, onOpenTab, starters = DEFAULT_STARTERS, subtitle }: Props) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  // Keep the newest message in view by scrolling only the message list. (scrollIntoView would also
  // scroll every ancestor — including the screen — to reveal the drawer while it is closed.)
  useEffect(() => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])
  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true })
  }, [open])

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', text: t }]
    setMsgs(next)
    setBusy(true)
    const turns: ChatTurn[] = next.filter((m) => m.role !== 'note').map((m) => ({ role: m.role as 'user' | 'model', text: m.text }))
    const r = await askAssistant('ask', turns, context)
    setBusy(false)
    if (!r.ok) {
      setMsgs((m) => [...m, { role: 'note', text: failureText(r).replace('The step-by-step guide still works.', 'Tap a point on the body for details.') }])
      return
    }
    const added: Msg[] = []
    if (r.text) added.push({ role: 'model', text: r.text })
    for (const a of r.actions) {
      if (a.name === 'open_system' && typeof a.args.system_id === 'string') {
        onOpenSystem(a.args.system_id as SystemId)
        added.push({ role: 'note', text: 'Showing it on the body' })
      }
      if (a.name === 'open_tab' && typeof a.args.tab === 'string') {
        onOpenTab(a.args.tab as AppTab)
        added.push({ role: 'note', text: `Opened ${a.args.tab}` })
      }
      if (a.name === 'start_emergency') {
        added.push({ role: 'note', text: 'Opening the emergency guide' })
        onEmergency()
      }
    }
    setMsgs((m) => [...m, ...added])
  }

  const speech = useSpeechInput((t) => void send(t))

  return (
    <div
      className="pointer-events-none absolute bottom-3 right-0 top-3 z-[45] flex items-center"
      style={{
        transform: open ? 'translateX(0)' : `translateX(calc(100% - ${HANDLE_W}px))`,
        transition: 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Handle — always visible on the right edge */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass pointer-events-auto flex h-44 shrink-0 flex-col items-center justify-center gap-3 !rounded-r-none border-r-0 text-accent hover:brightness-125"
        style={{ width: HANDLE_W }}
        aria-expanded={open}
        aria-controls="ask-halo-panel"
        aria-label={open ? 'Close Ask HALO' : 'Open Ask HALO'}
      >
        {open ? <ChevronRight className="h-5 w-5" aria-hidden /> : <MessageCircle className="h-5 w-5" aria-hidden />}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Ask HALO
        </span>
      </button>

      {/* Panel */}
      <aside
        id="ask-halo-panel"
        inert={!open}
        className="glass pointer-events-auto mr-3 flex h-full w-[min(400px,calc(100vw-84px))] flex-col overflow-hidden !rounded-tl-none"
        aria-label="Ask HALO"
      >
        <header className="border-b border-white/5 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Ask HALO</div>
          <div className="text-sm text-ink-dim">{subtitle ?? 'Questions about your health, measurements and risks'}</div>
        </header>

        <div ref={list} className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-ink-dim">Ask in your own words, or try:</p>
              {starters.map((s) => (
                <button key={s} onClick={() => void send(s)} className="block min-h-11 w-full rounded-xl border border-white/10 px-3 text-left text-sm hover:bg-white/5">
                  {s}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === 'note' ? (
              <p key={i} className="text-center font-mono text-[11px] uppercase tracking-wider text-ink-dim">
                {m.text}
              </p>
            ) : (
              <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${m.role === 'user' ? 'ml-auto bg-accent/20' : 'bg-white/[0.05]'}`}>
                {m.text}
              </div>
            ),
          )}
          {busy && <div className="w-16 animate-pulse rounded-2xl bg-white/[0.05] px-3.5 py-2.5 text-ink-dim">…</div>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
          className="flex gap-2 border-t border-white/5 p-3"
        >
          <input
            ref={field}
            value={speech.listening ? speech.interim || 'Listening…' : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={speech.listening}
            className="min-h-12 flex-1 rounded-xl border border-white/15 bg-space-900 px-3 outline-none placeholder:text-ink-dim focus:border-accent"
            aria-label="Your question"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              className={`min-h-12 min-w-12 rounded-xl border ${speech.listening ? 'border-warning text-warning' : 'border-white/15'}`}
              aria-label={speech.listening ? 'Stop listening' : 'Speak'}
            >
              {speech.listening ? <Square className="mx-auto h-4 w-4 fill-current" aria-hidden /> : <Mic className="mx-auto h-5 w-5" aria-hidden />}
            </button>
          )}
          <button type="submit" disabled={busy || !input.trim()} className="min-h-12 rounded-xl bg-accent px-4 font-bold text-space-950 disabled:opacity-40">
            Send
          </button>
        </form>
        <p className="px-4 pb-3 text-[10px] leading-snug text-ink-dim">
          AI answers (Claude) can be wrong and are not a diagnosis. Crew data is simulated. Talk to your Crew Medical Officer about anything worrying.
        </p>
      </aside>
    </div>
  )
}
