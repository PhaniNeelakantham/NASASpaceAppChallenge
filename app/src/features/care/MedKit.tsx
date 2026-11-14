import { useState } from 'react'
import { CREW } from '../../data/syntheticCrew'
import { DAY_MS, relTime, uid, useCrewStore } from '../../state/crewStore'
import type { EnvironmentId } from '../../state/mission'

// Onboard medical kit: stock, expiry, and a dose log shared by the crew.
// SIMULATED inventory for the prototype. Dosing always follows the package label and the
// crew medical checklist; HALO only tracks what was taken and when.

interface Med {
  id: string
  name: string
  form: string
  use: string
  count: number
  unit: string
  lowAt: number
  /** Minimum hours between doses, from the package label. */
  minHours: number
  expires: number
  /** Breaks down faster under space radiation (shorter real shelf life on deep-space missions). */
  radSensitive?: boolean
  /** Needs the flight surgeon's or CMO's OK first. */
  consult?: boolean
  emergency?: boolean
}

interface Dose {
  id: string
  med: string
  crewId: string
  at: number
}

interface Kit {
  meds: Med[]
  doses: Dose[]
}

function seedKit(): Kit {
  const now = Date.now()
  const d = (days: number) => now + days * DAY_MS
  return {
    meds: [
      { id: 'apap', name: 'Acetaminophen', form: '500 mg tablet', use: 'Pain, fever', count: 46, unit: 'tablets', lowAt: 12, minHours: 6, expires: d(420) },
      { id: 'ibu', name: 'Ibuprofen', form: '200 mg tablet', use: 'Pain, swelling', count: 38, unit: 'tablets', lowAt: 12, minHours: 6, expires: d(300), radSensitive: true },
      { id: 'prom', name: 'Promethazine', form: '25 mg tablet', use: 'Space motion sickness', count: 6, unit: 'tablets', lowAt: 8, minHours: 12, expires: d(180), radSensitive: true },
      { id: 'mel', name: 'Melatonin', form: '3 mg tablet', use: 'Sleep timing', count: 52, unit: 'tablets', lowAt: 14, minHours: 20, expires: d(500) },
      { id: 'lor', name: 'Loratadine', form: '10 mg tablet', use: 'Congestion, allergy', count: 27, unit: 'tablets', lowAt: 7, minHours: 24, expires: d(260) },
      { id: 'hc', name: 'Hydrocortisone 1 %', form: 'cream', use: 'Rash, itching', count: 2, unit: 'tubes', lowAt: 1, minHours: 6, expires: d(150) },
      { id: 'eye', name: 'Saline eye drops', form: 'bottle', use: 'Dry eyes (dry cabin air)', count: 5, unit: 'bottles', lowAt: 2, minHours: 1, expires: d(-4) },
      { id: 'kcit', name: 'Potassium citrate', form: 'tablet', use: 'Kidney-stone prevention (prescribed)', count: 84, unit: 'tablets', lowAt: 20, minHours: 10, expires: d(390) },
      { id: 'amox', name: 'Amoxicillin', form: '500 mg capsule', use: 'Bacterial infection', count: 21, unit: 'capsules', lowAt: 10, minHours: 8, expires: d(40), radSensitive: true, consult: true },
      { id: 'epi', name: 'Epinephrine auto-injector', form: 'pen', use: 'Severe allergic reaction', count: 2, unit: 'pens', lowAt: 1, minHours: 0, expires: d(210), radSensitive: true, emergency: true },
    ],
    doses: [
      { id: 'd1', med: 'apap', crewId: 'c2', at: now - 5 * 3_600_000 },
      { id: 'd2', med: 'mel', crewId: 'c1', at: now - 16 * 3_600_000 },
      { id: 'd3', med: 'apap', crewId: 'c3', at: now - 30 * 3_600_000 },
    ],
  }
}

const DEEP_SPACE: EnvironmentId[] = ['transit', 'marsBase']

function status(m: Med, env: EnvironmentId, now: number): { word: string; shape: string; cls: string } {
  // On deep-space missions, radiation-sensitive drugs are treated as expiring ~25 % sooner.
  const left = m.expires - now
  const eff = m.radSensitive && DEEP_SPACE.includes(env) && left > 0 ? left * 0.75 : left
  if (eff <= 0) return { word: 'Expired', shape: '◆', cls: 'text-warning' }
  if (m.count <= m.lowAt) return { word: 'Low stock', shape: '▲', cls: 'text-caution' }
  if (eff < 60 * DAY_MS) return { word: `Expires in ${Math.ceil(eff / DAY_MS)} d`, shape: '▲', cls: 'text-caution' }
  return { word: 'OK', shape: '●', cls: 'text-nominal' }
}

export function MedKit({ crewId, env }: { crewId: string; env: EnvironmentId }) {
  const [kit, setKit] = useCrewStore<Kit>('medkit', 'all', seedKit)
  const [confirm, setConfirm] = useState<{ med: Med; reason: string } | null>(null)
  const [logged, setLogged] = useState<string | null>(null)
  const now = Date.now()
  const deep = DEEP_SPACE.includes(env)

  const lastDose = (med: string) => kit.doses.filter((x) => x.med === med && x.crewId === crewId).sort((a, b) => b.at - a.at)[0]

  const log = (m: Med) => {
    setKit((k) => ({
      meds: k.meds.map((x) => (x.id === m.id ? { ...x, count: Math.max(0, x.count - 1) } : x)),
      doses: [...k.doses, { id: uid(), med: m.id, crewId, at: Date.now() }].slice(-300),
    }))
    setConfirm(null)
    setLogged(m.name)
  }

  const tryLog = (m: Med) => {
    const last = lastDose(m.id)
    const st = status(m, env, now)
    if (m.count === 0) return setConfirm({ med: m, reason: 'None left in the kit. Check the backup stowage list.' })
    if (st.word === 'Expired') return setConfirm({ med: m, reason: 'This item is past its expiry date. Ask the Crew Medical Officer before using it.' })
    if (m.consult) return setConfirm({ med: m, reason: 'This medicine needs the flight surgeon’s or Crew Medical Officer’s OK first.' })
    if (last && m.minHours && now - last.at < m.minHours * 3_600_000) {
      const h = ((now - last.at) / 3_600_000).toFixed(1)
      return setConfirm({ med: m, reason: `You logged this ${h} h ago. The label says to wait at least ${m.minHours} h between doses.` })
    }
    log(m)
  }

  const alerts = kit.meds.filter((m) => status(m, env, now).word !== 'OK')
  const name = (id: string) => CREW.find((c) => c.id === id)?.name ?? id

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        {confirm && (
          <div className="glass border-caution/50 p-4">
            <p className="text-sm text-caution">▲ {confirm.reason}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirm(null)} className="min-h-11 flex-1 rounded-lg bg-space-800 text-sm">
                Don’t log
              </button>
              {confirm.med.count > 0 && (
                <button onClick={() => log(confirm.med)} className="min-h-11 flex-1 rounded-lg bg-caution text-sm font-semibold text-space-950">
                  {confirm.med.consult ? 'Approved — log dose' : 'Log anyway'}
                </button>
              )}
            </div>
          </div>
        )}
        {logged && !confirm && <p className="text-sm text-nominal">● Logged one dose of {logged}.</p>}
        <ul className="flex flex-col gap-2">
          {kit.meds.map((m) => {
            const st = status(m, env, now)
            const last = lastDose(m.id)
            return (
              <li key={m.id} className={`glass flex flex-wrap items-center gap-3 p-3 ${m.emergency ? 'border-warning/40' : ''}`}>
                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-xs text-ink-dim">{m.form}</span>
                    {m.consult && <span className="rounded-full bg-accent/10 px-2 font-mono text-[10px] uppercase text-accent">Ask CMO</span>}
                    {m.emergency && <span className="rounded-full bg-warning/15 px-2 font-mono text-[10px] uppercase text-warning">Emergency</span>}
                    {m.radSensitive && deep && <span className="rounded-full bg-caution/10 px-2 font-mono text-[10px] uppercase text-caution">Radiation-sensitive</span>}
                  </div>
                  <div className="text-xs text-ink-dim">
                    {m.use}
                    {last && <> · you took one {relTime(last.at)}</>}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="font-mono text-lg font-bold">{m.count}</div>
                  <div className="font-mono text-[10px] text-ink-dim">{m.unit}</div>
                </div>
                <div className={`w-32 font-mono text-xs ${st.cls}`}>
                  {st.shape} {st.word}
                </div>
                {!m.emergency && (
                  <button onClick={() => tryLog(m)} className="min-h-11 rounded-lg bg-space-800 px-3 text-sm hover:bg-space-700">
                    Log dose
                  </button>
                )}
                {m.emergency && (
                  <button onClick={() => tryLog(m)} className="min-h-11 rounded-lg bg-warning/20 px-3 text-sm text-warning">
                    Used
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <aside className="flex flex-col gap-4">
        <div className="glass p-4">
          <div className="section-h">Needs attention · {alerts.length}</div>
          {alerts.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {alerts.map((m) => {
                const st = status(m, env, now)
                return (
                  <li key={m.id} className={st.cls}>
                    {st.shape} {m.name}: {st.word.toLowerCase()}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-dim">Everything is stocked and in date.</p>
          )}
          {deep && (
            <p className="mt-3 text-xs text-ink-dim">
              Deep-space radiation can make some medicines lose strength before their printed date. HALO treats those as expiring about 25 % sooner on this
              mission. Resupply from Earth isn’t possible.
            </p>
          )}
        </div>
        <div className="glass p-4">
          <div className="section-h">Recent doses · whole crew</div>
          <ul className="flex flex-col gap-1 text-xs">
            {[...kit.doses]
              .sort((a, b) => b.at - a.at)
              .slice(0, 8)
              .map((x) => (
                <li key={x.id} className="flex justify-between gap-2">
                  <span>{kit.meds.find((m) => m.id === x.med)?.name}</span>
                  <span className="text-ink-dim">
                    {name(x.crewId)} · {relTime(x.at)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
