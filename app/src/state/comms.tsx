import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SYSTEMS } from '../content/systems'
import type { SystemId } from '../types'
import { ENVIRONMENTS, type EnvironmentId, type EscalationMode } from './mission'

/** A medical consult message. Times are on the (warpable) mission clock, in ms. */
export interface CommsMessage {
  id: number
  system: SystemId
  env: EnvironmentId
  mode: EscalationMode
  to: string
  body: string
  sentAt: number
  /** When the message reaches the recipient. */
  arriveAt: number
  /** When the reply is back with the astronaut. */
  replyAt: number
  from: string
  reply: string
}

export type CommsPhase = 'transit' | 'awaiting' | 'replied'

interface CommsApi {
  messages: CommsMessage[]
  now: number
  send: (system: SystemId, env: EnvironmentId, body: string) => void
  phase: (m: CommsMessage) => CommsPhase
  /** Demo control: jump the mission clock to the next pending event. */
  fastForward: () => void
  pending: CommsMessage[]
}

const Ctx = createContext<CommsApi | null>(null)

/** Time the ground (or base) takes to read data and answer, on top of signal travel. */
const RESPONSE_MS = { live: 3000, radio: 5000, queued: 2 * 60 * 1000 }

function replyFor(system: SystemId, mode: EscalationMode): { from: string; text: string } {
  const s = SYSTEMS[system]
  const step = s.actions[0].charAt(0).toLowerCase() + s.actions[0].slice(1)
  if (mode === 'radio') {
    return {
      from: 'Base Crew Medical Officer',
      text: `Copy. Reviewed your ${s.label.toLowerCase()} readings. Continue: ${step}. If it gets worse, stop the traverse and head back to base.`,
    }
  }
  return {
    from: 'Flight surgeon, Mission Control',
    text: `Reviewed your ${s.label.toLowerCase()} data. Agree with the onboard plan: ${step}. Send a new check-in in 6 hours, sooner if it worsens.`,
  }
}

export function CommsProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<CommsMessage[]>([])
  const [warp, setWarp] = useState(0)
  const [tick, setTick] = useState(() => Date.now())
  const now = tick + warp

  const pending = useMemo(() => messages.filter((m) => m.replyAt > now), [messages, now])

  // Only tick (re-render once a second) while something is in flight.
  useEffect(() => {
    if (pending.length === 0) return
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [pending.length])

  const send = useCallback(
    (system: SystemId, envId: EnvironmentId, body: string) => {
      const env = ENVIRONMENTS[envId]
      const mode = env.escalation.mode
      const t0 = Date.now() + warp
      const travel = mode === 'queued' ? env.oneWayDelaySec * 1000 : 0
      const r = replyFor(system, mode)
      setTick(Date.now())
      setMessages((ms) => [
        ...ms,
        {
          id: ms.length + 1,
          system,
          env: envId,
          mode,
          to: mode === 'radio' ? env.escalation.firstContact : 'Flight surgeon, Mission Control',
          body,
          sentAt: t0,
          arriveAt: t0 + travel,
          replyAt: t0 + travel * 2 + RESPONSE_MS[mode],
          from: r.from,
          reply: r.text,
        },
      ])
    },
    [warp],
  )

  const phase = useCallback((m: CommsMessage): CommsPhase => (now < m.arriveAt ? 'transit' : now < m.replyAt ? 'awaiting' : 'replied'), [now])

  const fastForward = useCallback(() => {
    const next = pending.map((m) => (now < m.arriveAt ? m.arriveAt : m.replyAt)).sort((a, b) => a - b)[0]
    if (next !== undefined) setWarp((w) => w + (next - now) + 50)
  }, [pending, now])

  const api = useMemo(() => ({ messages, now, send, phase, fastForward, pending }), [messages, now, send, phase, fastForward, pending])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useComms(): CommsApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useComms must be used inside <CommsProvider>')
  return c
}
