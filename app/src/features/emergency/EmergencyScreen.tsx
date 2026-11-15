import { inl, ToneIcon } from '../../components/ToneIcon'
import { Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NODES, PROTOCOLS, txt, type Ctx, type Protocol } from '../../content/emergency'
import { CREW, READINGS } from '../../data/syntheticCrew'
import { useComms } from '../../state/comms'
import { ENVIRONMENTS, formatCountdown, formatDelay, type EnvironmentId } from '../../state/mission'
import { askAssistant } from '../../ai/client'
import { EmergencyCopilot } from './EmergencyCopilot'
import { CprCoach, fmt, speak, StepTimer, VitalsQuick } from './tools'

interface Props {
  env: EnvironmentId
  /** The astronaut using the tablet. */
  userId: string
  onClose: () => void
}

interface LogEntry {
  at: number
  text: string
}

/**
 * Full-screen emergency guide: who needs help → what is happening → one instruction at a time.
 * Designed for a non-doctor rescuer: big buttons, plain words, read aloud, everything logged.
 */
export function EmergencyScreen({ env, userId, onClose }: Props) {
  const e = ENVIRONMENTS[env]
  const zeroG = e.gravity === '0 g'
  const { send, messages, now, phase } = useComms()

  const [patientId, setPatientId] = useState<string | null>(null)
  const [protocol, setProtocol] = useState<Protocol | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [voice, setVoice] = useState(true)
  const [startedAt] = useState(() => Date.now())
  const [tick, setTick] = useState(Date.now())
  const [confirmExit, setConfirmExit] = useState(false)
  const [called, setCalled] = useState(false)
  const sentAt = useRef<number | null>(null)

  const patient = CREW.find((c) => c.id === patientId)
  const c: Ctx = { env, zeroG, patient: patient ? `the ${patient.name}` : 'them' }
  const [handover, setHandover] = useState<{ text: string; busy: boolean; sent?: boolean } | null>(null)
  const nodeId = history.at(-1)
  const node = nodeId ? NODES[nodeId] : undefined

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const addLog = useCallback((text: string) => setLog((l) => [...l, { at: Date.now(), text }]), [])

  // Kept in a ref too, so a patient and guide confirmed together start with the right name.
  const patientRef = useRef<string | null>(null)
  const choosePatient = (id: string) => {
    patientRef.current = id
    setPatientId(id)
    addLog(`Patient: ${CREW.find((m) => m.id === id)?.name ?? id}`)
  }

  // Read each new instruction aloud.
  useEffect(() => {
    if (node) speak(`${txt(node.text, c)} ${node.kind === 'ask' ? '' : txt(node.detail, c)}`, voice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const escalate = useCallback(
    (p: Protocol, who: string) => {
      const body = `EMERGENCY: ${p.title}: ${who}. Live log attached; crew is following HALO guidance.`
      send(p.system, env, body)
      sentAt.current = Date.now()
      addLog(
        e.escalation.mode === 'queued'
          ? `Emergency consult queued to Earth (arrives in ${formatDelay(e.oneWayDelaySec)})`
          : `${e.escalation.mode === 'radio' ? 'Radio call to' : 'Call to'} ${e.escalation.firstContact}`,
      )
      setCalled(true)
    },
    [send, env, e, addLog],
  )

  const startProtocol = (p: Protocol) => {
    const who = CREW.find((m) => m.id === patientRef.current)?.name
    setProtocol(p)
    setHistory([p.start])
    addLog(`Started: ${p.title}, patient ${who ?? 'unknown'}`)
    // Far from Earth: tell the ground immediately, don't wait for the crew to remember.
    if (e.escalation.mode === 'queued') escalate(p, who ?? 'crew member')
  }

  const go = useCallback(
    (next: string, answer: string) => {
      if (!node) return
      addLog(`${txt(node.text, c)} → ${answer}`)
      setHistory((h) => [...h, next])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node, addLog, patientId],
  )

  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))

  // Keyboard: Y / N / Enter / Backspace
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!node || (ev.target as HTMLElement)?.tagName === 'INPUT') return
      if (node.kind === 'ask' && ev.key.toLowerCase() === 'y') go(node.yes, 'Yes')
      if (node.kind === 'ask' && ev.key.toLowerCase() === 'n') go(node.no, 'No')
      if (node.kind === 'do' && ev.key === 'Enter') go(node.next, 'Done')
      if (ev.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [node, go])

  const consult = useMemo(() => (sentAt.current ? messages.filter((m) => m.sentAt >= sentAt.current! - 1000).at(-1) : undefined), [messages, called])

  const elapsed = tick - startedAt
  const step = history.length

  // What the AI copilot is told about the situation (no free-form app internals).
  const aiContext = useMemo(() => {
    const r = patientId ? READINGS[patientId]?.at(-1) : undefined
    return {
      environment: { kind: e.kind, place: e.label, gravity: e.gravity, earthOneWaySeconds: e.oneWayDelaySec, escalation: e.escalation.mode, firstContact: e.escalation.firstContact, evacuation: e.evacuation },
      crew: CREW.map((m) => ({ id: m.id, title: m.name, isRescuer: m.id === userId })),
      patient: patient ? { id: patient.id, title: patient.name, lastReadings: r ? { ...r.values, symptoms: r.symptoms } : null } : null,
      minutesSinceStart: Math.round((Date.now() - startedAt) / 60000),
      guides: PROTOCOLS.map((x) => ({ id: x.id, title: x.title })),
      runningGuide: protocol ? { id: protocol.id, title: protocol.title } : null,
      currentStep: node ? { kind: node.kind, instruction: txt(node.text, c), detail: txt(node.detail, c), answers: node.kind === 'ask' ? ['yes', 'no'] : node.kind === 'do' ? ['done'] : [] } : null,
      recentLog: log.slice(-8).map((l) => `[${fmt(l.at - startedAt)}] ${l.text}`),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, protocol, nodeId, log, env])

  const aiChoosePatient = (id: string, reason: string) => {
    if (!CREW.some((m) => m.id === id)) return
    choosePatient(id)
    addLog(`AI suggested patient (${reason}), confirmed by rescuer`)
  }
  const directAnswer = (answer: 'yes' | 'no' | 'done') => {
    if (!node) return
    if (node.kind === 'ask' && answer !== 'done') go(answer === 'yes' ? node.yes : node.no, `${answer === 'yes' ? node.yesLabel ?? 'Yes' : node.noLabel ?? 'No'} (said aloud)`)
    if (node.kind === 'do' && answer === 'done') go(node.next, `${node.doneLabel ?? 'Done'} (said aloud)`)
  }
  const fullLog = () => log.map((l) => `[${fmt(l.at - startedAt)}] ${l.text}`)
  const writeHandover = async () => {
    setHandover({ text: '', busy: true })
    const r = await askAssistant('handover', [{ role: 'user', text: 'Write the handover report now.' }], { ...aiContext, recentLog: fullLog().slice(-60) })
    if (r.ok) {
      setHandover({ text: r.text, busy: false })
      addLog('AI handover report written')
    } else {
      // Offline: a plain report built from the log.
      setHandover({
        text: `Situation: ${patient?.name ?? 'Crew member'}, ${protocol?.title ?? 'emergency'}, ${fmt(Date.now() - startedAt)} since start.\nLog: ${fullLog().join(' | ')}`,
        busy: false,
      })
    }
  }
  const aiChooseProtocol = (id: string, reason: string) => {
    const p = PROTOCOLS.find((x) => x.id === id)
    if (!p) return
    addLog(`AI suggested “${p.title}” (${reason}), confirmed by rescuer`)
    startProtocol(p)
  }
  const aiAnswer = (answer: 'yes' | 'no' | 'done', reason: string) => {
    if (!node) return
    const tag = ` (AI-suggested: “${reason}”, confirmed)`
    if (node.kind === 'ask' && answer !== 'done') go(answer === 'yes' ? node.yes : node.no, `${answer === 'yes' ? 'Yes' : 'No'}${tag}`)
    if (node.kind === 'do' && answer === 'done') go(node.next, `Done${tag}`)
  }
  const aiConsult = (summary: string) => {
    send(protocol?.system ?? 'heart', env, `EMERGENCY: ${summary}`)
    addLog('Consult sent (AI-drafted, confirmed by rescuer)')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-[#07080d] text-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Emergency guide"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-warning/60 bg-warning/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-warning text-xl font-black text-space-950">!</span>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-warning">Emergency</div>
            <div className="text-lg font-bold leading-tight">{protocol ? protocol.title : patient ? 'What is happening?' : 'Who needs help?'}</div>
          </div>
        </div>
        {patient && (
          <div className="text-sm">
            <span className="text-ink-dim">Patient </span>
            <b>{patient.name}</b>
          </div>
        )}
        <div className="text-sm">
          <span className="text-ink-dim">Time since start </span>
          <b className="tabular-nums">{fmt(elapsed)}</b>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              setVoice((v) => !v)
              window.speechSynthesis?.cancel()
            }}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm"
            aria-pressed={voice}
          >
            {voice ? <><Volume2 className={inl} /> Reading aloud</> : <><VolumeX className={inl} /> Voice off</>}
          </button>
          <button
            onClick={() => (confirmExit ? onClose() : setConfirmExit(true))}
            onBlur={() => setConfirmExit(false)}
            className={`min-h-12 rounded-xl px-4 text-sm font-semibold ${confirmExit ? 'bg-white text-space-950' : 'border border-white/15'}`}
          >
            {confirmExit ? 'Tap again to end' : 'End emergency'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <main className="flex min-h-0 flex-col overflow-y-auto overflow-x-hidden">
          <EmergencyCopilot
            context={aiContext}
            currentNodeId={nodeId ?? null}
            currentKind={node?.kind ?? null}
            hasPatient={!!patient}
            hasProtocol={!!protocol}
            voice={voice}
            onChoosePatient={aiChoosePatient}
            onChooseProtocol={aiChooseProtocol}
            onAnswer={aiAnswer}
            onDirectAnswer={directAnswer}
            onLog={addLog}
            onConsult={aiConsult}
          />
          {!patient && !protocol && (
            <section>
              <p className="mb-4 text-2xl font-semibold">
                Who needs help? <span className="text-base font-normal text-ink-dim">Tap, or just tell HALO.</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CREW.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => choosePatient(m.id)}
                    className="flex min-h-24 items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.03] px-5 text-left hover:border-warning/60 hover:bg-warning/5"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-sm font-bold">{m.name.split(' ').map((w) => w[0]).join('')}</span>
                    <span>
                      <span className="block text-xl font-bold">
                        {m.name}
                        {m.id === userId && <span className="ml-2 text-sm font-normal text-ink-dim">(me)</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {patient && !protocol && (
            <section>
              <p className="mb-4 text-2xl font-semibold">What is happening to the {patient.name}?</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PROTOCOLS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => startProtocol(p)}
                    className={`flex min-h-28 flex-col justify-center gap-1 rounded-2xl border px-5 text-left ${
                      p.urgent ? 'border-warning/50 bg-warning/10 hover:bg-warning/20' : 'border-white/15 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <p.icon aria-hidden className="h-8 w-8" />
                    <span className="text-xl font-bold leading-tight">{p.tile}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-ink-dim">Not sure? Pick “Collapsed or not responding”. It starts with the safety and breathing checks.</p>
            </section>
          )}

          {protocol && node && (
            <AnimatePresence mode="wait">
              <motion.section
                key={`${nodeId}-${step}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-5"
              >
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-dim">
                  Step {step} {node.kind === 'end' ? '· final' : ''}
                </div>
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{txt(node.text, c)}</h1>
                {txt(node.detail, c) && <p className="max-w-3xl text-xl leading-snug text-ink/85">{txt(node.detail, c)}</p>}

                {node.kind === 'do' && node.tool === 'cpr' && <CprCoach voice={voice} onLog={addLog} />}
                {node.kind === 'do' && node.tool === 'timer' && node.timerSec && <StepTimer seconds={node.timerSec} voice={voice} onLog={addLog} />}
                {node.kind === 'do' && node.tool === 'vitals' && patientId && <VitalsQuick last={READINGS[patientId]?.at(-1)} onLog={addLog} />}

                {node.kind === 'ask' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button onClick={() => go(node.yes, node.yesLabel ?? 'Yes')} className="min-h-24 rounded-2xl border-2 border-white/25 bg-white/[0.06] text-3xl font-black hover:bg-white/10">
                      {node.yesLabel ?? 'Yes'}
                      <span className="block font-mono text-xs font-normal text-ink-dim">key Y</span>
                    </button>
                    <button onClick={() => go(node.no, node.noLabel ?? 'No')} className="min-h-24 rounded-2xl border-2 border-white/25 bg-white/[0.06] text-3xl font-black hover:bg-white/10">
                      {node.noLabel ?? 'No'}
                      <span className="block font-mono text-xs font-normal text-ink-dim">key N</span>
                    </button>
                  </div>
                )}
                {node.kind === 'do' && (
                  <button onClick={() => go(node.next, node.doneLabel ?? 'Done')} className="min-h-20 rounded-2xl bg-accent text-2xl font-black text-space-950 hover:brightness-110">
                    {node.doneLabel ?? 'Done'} ›<span className="block font-mono text-xs font-normal opacity-70">key Enter</span>
                  </button>
                )}
                {node.kind === 'end' && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        send(protocol.system, env, `Emergency log (${protocol.title}, ${patient?.name}): ${fullLog().join(' | ')}`)
                        addLog('Full log sent')
                      }}
                      className="min-h-16 rounded-2xl bg-accent px-6 text-lg font-bold text-space-950"
                    >
                      Send full log to {e.escalation.mode === 'radio' ? 'base' : 'Earth'}
                    </button>
                    <button onClick={() => setHistory([protocol.start])} className="min-h-16 rounded-2xl border border-white/20 px-6 text-lg">
                      Start this guide again
                    </button>
                    <button onClick={() => setProtocol(null)} className="min-h-16 rounded-2xl border border-white/20 px-6 text-lg">
                      Different problem
                    </button>
                  </div>
                )}

                {history.length > 1 && (
                  <button onClick={back} className="self-start rounded-lg px-2 py-2 text-sm text-ink-dim hover:text-ink">
                    ‹ Previous step <span className="font-mono text-xs">(Backspace)</span>
                  </button>
                )}
              </motion.section>
            </AnimatePresence>
          )}
        </main>

        {/* Side column: help status, patient, log */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Getting help · {e.kind}</div>
            {e.escalation.mode === 'queued' ? (
              <>
                <p className="mt-1 text-sm">
                  Earth is <b className="text-caution">{formatDelay(e.oneWayDelaySec)}</b> away each way. <b>You are the first responders.</b> Keep following the steps.
                </p>
                {consult && (
                  <p className="mt-2 rounded-lg bg-white/[0.04] p-2 text-sm">
                    {phase(consult) === 'transit' && <><ToneIcon tone="caution" /> Emergency consult in transit, arrives in {formatCountdown(consult.arriveAt - now)}</>}
                    {phase(consult) === 'awaiting' && <><ToneIcon tone="caution" /> Delivered, earliest reply in {formatCountdown(consult.replyAt - now)}</>}
                    {phase(consult) === 'replied' && <><ToneIcon tone="nominal" /> Flight surgeon replied (simulated): {consult.reply}</>}
                  </p>
                )}
                {!consult && protocol && <p className="mt-2 text-sm text-ink-dim">Consult will be sent automatically.</p>}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm">{e.escalation.firstContact} can be reached now.</p>
                <button
                  onClick={() => protocol && escalate(protocol, patient?.name ?? 'crew member')}
                  disabled={!protocol || called}
                  className="mt-2 min-h-14 w-full rounded-xl bg-warning text-lg font-bold text-space-950 disabled:opacity-40"
                >
                  {called ? 'Connected (simulated)' : e.escalation.mode === 'radio' ? 'Radio base medic now' : 'Call flight surgeon now'}
                </button>
                {e.escalation.fallback && <p className="mt-2 text-xs text-ink-dim">Also: {e.escalation.fallback}</p>}
              </>
            )}
            <p className="mt-2 text-xs text-ink-dim">Evacuation: {e.evacuation}</p>
          </section>

          {patientId && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Last HALO readings · {patient?.name}</div>
              {(() => {
                const r = READINGS[patientId]?.at(-1)
                if (!r) return <p className="text-sm text-ink-dim">No readings.</p>
                return (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Pulse', r.values.heartRate, '/min'],
                      ['BP', `${r.values.systolic}/${r.values.diastolic}`, ''],
                      ['O₂', r.values.spo2, '%'],
                      ['Temp', r.values.temperature, '°C'],
                      ['Sleep', r.values.sleepHours, 'h'],
                      ['Day', r.missionDay, ''],
                    ].map(([k, val, u]) => (
                      <div key={k as string} className="rounded-lg bg-white/[0.04] p-1.5">
                        <div className="font-mono text-[9px] uppercase text-ink-dim">{k}</div>
                        <div className="font-bold tabular-nums">
                          {val}
                          <span className="text-xs font-normal text-ink-dim">{u}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              <p className="mt-2 text-xs text-ink-dim">Check the medical record for allergies before giving any medicine.</p>
            </section>
          )}

          {protocol && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
                Handover report · for the {e.escalation.mode === 'radio' ? 'base medic' : 'flight surgeon'}
              </div>
              {!handover && (
                <button onClick={() => void writeHandover()} className="mt-2 min-h-12 w-full rounded-xl border border-accent/50 text-sm font-semibold text-accent hover:bg-accent/10">
                  Have HALO write the handover
                </button>
              )}
              {handover?.busy && <p className="mt-2 animate-pulse text-sm text-ink-dim">HALO is writing the report from the log…</p>}
              {handover && !handover.busy && (
                <>
                  <p className="mt-2 whitespace-pre-line text-sm leading-snug">{handover.text}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        send(protocol.system, env, `HANDOVER: ${handover.text}`)
                        addLog('Handover report sent')
                        setHandover({ ...handover, sent: true })
                      }}
                      disabled={handover.sent}
                      className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-bold text-space-950 disabled:opacity-40"
                    >
                      {handover.sent ? 'Sent' : `Send to ${e.escalation.mode === 'radio' ? 'base' : 'Earth'}`}
                    </button>
                    <button onClick={() => void writeHandover()} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm">
                      Update
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          <section className="flex min-h-40 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Event log · auto-recorded</div>
            <ol className="mt-2 flex-1 space-y-1.5 overflow-y-auto text-sm">
              {log.length === 0 && <li className="text-ink-dim">Every answer and action is timestamped here.</li>}
              {[...log].reverse().map((l, i) => (
                <li key={log.length - i} className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-ink-dim tabular-nums">{fmt(l.at - startedAt)}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ol>
          </section>
          <p className="px-1 text-[11px] leading-snug text-ink-dim">
            Prototype decision support based on standard first-aid steps, adapted for spaceflight. Not a medical device. Follow your vehicle’s medical checklists and
            your Crew Medical Officer.
          </p>
        </aside>
      </div>
    </motion.div>
  )
}
