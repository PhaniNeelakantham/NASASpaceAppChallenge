import { SYSTEMS } from '../../../content/systems'
import { useComms } from '../../../state/comms'
import { ENVIRONMENTS, formatCountdown, formatDelay, type EnvironmentId } from '../../../state/mission'
import type { SystemId } from '../../../types'
import type { SystemView } from '../health'

interface Props {
  view: SystemView
  env: EnvironmentId
  color: string
}

const ACTION_LABEL = {
  live: 'Call flight surgeon now',
  radio: 'Radio base medical officer',
  queued: 'Send consult to Earth',
}

/**
 * Escalation adapts to where the astronaut is:
 *  - ISS / Moon base: live call to the flight surgeon.
 *  - Rover: radio the base's crew medical officer; option to drive back.
 *  - Mars transit / base: queue a message; the reply arrives after the real round-trip delay.
 */
export function EscalationPanel({ view, env, color }: Props) {
  const e = ENVIRONMENTS[env]
  const s = SYSTEMS[view.id]
  const { messages, now, send, phase, fastForward } = useComms()
  const mine = messages.filter((m) => m.system === view.id)
  const mode = e.escalation.mode

  const draft = `${view.label}: ${view.trend}`

  return (
    <section className="rounded-xl border p-3" style={{ borderColor: `${color}55` }}>
      <h3 className="section-h">Escalate</h3>
      <p className="text-sm">
        <span className="text-ink-dim">When: </span>
        {s.escalateIf}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-lg bg-white/[0.03] p-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim">First contact</div>
          {e.escalation.firstContact}
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim">Earth</div>
          {mode === 'queued' ? (
            <span className="text-caution">
              {formatDelay(e.oneWayDelaySec)} each way · reply ≥ {Math.round((e.oneWayDelaySec * 2) / 60 + 2)} min
            </span>
          ) : (
            <span className="text-nominal">Live</span>
          )}
        </div>
      </div>
      {e.escalation.fallback && <p className="mt-2 text-[12px] text-ink-dim">Fallback: {e.escalation.fallback}</p>}
      {mode === 'queued' && (
        <p className="mt-2 text-[12px] text-ink-dim">
          Don’t wait for Earth: follow the procedure above with your crew medical officer. The flight surgeon reviews and advises later.
        </p>
      )}

      <button
        onClick={() => send(view.id as SystemId, env, draft)}
        className="hud-btn mt-3 w-full border font-semibold"
        style={{ borderColor: `${color}80`, color }}
      >
        {ACTION_LABEL[mode]}
        <span className="block text-[11px] font-normal text-ink-dim">Attaches today’s {view.label.toLowerCase()} readings</span>
      </button>

      {mine.length > 0 && (
        <ul className="mt-3 space-y-2">
          {mine.map((m) => {
            const p = phase(m)
            return (
              <li key={m.id} className="rounded-lg bg-white/[0.03] p-2.5 text-[12px]">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-ink-dim">To {m.to}</span>
                  {p === 'transit' && <span className="text-caution">▲ In transit · arrives {formatCountdown(m.arriveAt - now)}</span>}
                  {p === 'awaiting' && <span className="text-caution">▲ Delivered · reply in {formatCountdown(m.replyAt - now)}</span>}
                  {p === 'replied' && <span className="text-nominal">● Reply received</span>}
                </div>
                <p className="mt-1 text-ink-dim">“{m.body}”</p>
                {p === 'replied' && (
                  <div className="mt-2 border-l-2 border-nominal/60 pl-2">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-nominal">{m.from} (simulated)</div>
                    <p>{m.reply}</p>
                  </div>
                )}
                {p !== 'replied' && m.mode === 'queued' && (
                  <button onClick={fastForward} className="mt-2 min-h-10 rounded-lg border border-white/10 px-3 font-mono text-[10px] uppercase tracking-wider text-ink-dim hover:text-ink">
                    ⏩ Demo: skip ahead
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
