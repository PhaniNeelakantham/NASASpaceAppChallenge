import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StatusBadge } from '../../components/StatusBadge'
import { SYSTEMS } from '../../content/systems'
import { ENVIRONMENTS, formatDelay, type EnvironmentId } from '../../state/mission'
import type { Finding, Reading, Status, SystemId } from '../../types'
import { readJSON, today, usePersistentState, writeJSON } from '../../state/persist'
import { buildSystemViews } from './health'
import { NODES, ZONES, type ZoneId } from './nodes/nodeConfig'
import type { Detail } from './anatomy/models'
import { BodyScene } from './scene/BodyScene'
import type { Focus } from './scene/CameraRig'
import { LAYERS, type LayerId } from './theme'
import { DetailPanel } from './ui/DetailPanel'
import { AskHalo } from '../../components/AskHalo'
import { GuidePanel } from './ui/GuidePanel'
import { Tour } from './ui/Tour'
import { LayerControl } from './ui/LayerControl'
import { ZonePills } from './ui/ZonePills'

interface Props {
  crewId: string
  readings: Reading[]
  findings: Finding[]
  statuses: Record<SystemId, Status>
  env: EnvironmentId
  /** Go to the Check-in tab. */
  onCheckIn: () => void
  onEmergency: () => void
  /** Ask the body view to show a system (e.g. from Ask HALO on another tab). */
  focusRequest?: { id: SystemId; nonce: number } | null
  onOpenTab: (tab: 'checkin' | 'trends' | 'radiation' | 'learn') => void
}

const RANK: Record<Status, number> = { warning: 3, caution: 2, nominal: 1, nodata: 0 }

export function Body3DScreen({ crewId, readings, findings, statuses, env, onCheckIn, onEmergency, onOpenTab, focusRequest }: Props) {
  const views = useMemo(() => buildSystemViews(readings, findings, statuses), [readings, findings, statuses])
  const [selected, setSelected] = useState<SystemId | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [depth, setDepth] = useState(0)
  const [hidden, setHidden] = useState<Record<LayerId, boolean>>({ skin: false, musculo: false, cardio: false, organs: false })
  const [zone, setZone] = useState<ZoneId>('full')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [detail, setDetailState] = useState<Detail>(() => {
    try {
      const d = localStorage.getItem('halo.detail')
      if (d === 'low' || d === 'medium' || d === 'high') return d
    } catch {
      /* storage unavailable */
    }
    return 'medium'
  })
  const setDetail = (d: Detail) => {
    setDetailState(d)
    try {
      localStorage.setItem('halo.detail', d)
    } catch {
      /* storage unavailable */
    }
  }

  const layerVisible = useMemo(
    () => Object.fromEntries(LAYERS.map((l, i) => [l.id, i >= depth && !hidden[l.id]])) as Record<LayerId, boolean>,
    [depth, hidden],
  )

  const [layersOpen, setLayersOpen] = useState(false)
  const [showAllLabels, setShowAllLabels] = useState(false)
  // Which systems the astronaut has reviewed today (advances the guide) — saved per crew member per day.
  const [reviewedList, setReviewedList] = usePersistentState<SystemId[]>(`halo.guide.reviewed.${crewId}.${today()}`, [])
  const reviewed = useMemo(() => new Set(reviewedList), [reviewedList])
  // The tutorial is shown once per crew member (one shared tablet, several astronauts).
  const tourKey = `halo.tourDone.${crewId}`
  const [tourOpen, setTourOpen] = useState(() => !readJSON(tourKey, false))
  useEffect(() => {
    setTourOpen(!readJSON(tourKey, false))
  }, [tourKey])
  const closeTour = () => {
    setTourOpen(false)
    writeJSON(tourKey, true)
  }
  const environment = ENVIRONMENTS[env]
  const priorities = useMemo(() => new Set(environment.priorities), [environment])
  const alerts = Object.values(views)
    .filter((v) => v.status === 'caution' || v.status === 'warning')
    // worst first; within the same status, this environment's priority risks first
    .sort((a, b) => RANK[b.status] - RANK[a.status] || Number(priorities.has(b.id)) - Number(priorities.has(a.id)))

  // Brief confirmation of what changed when the environment switches (not on first render).
  const [toast, setToast] = useState<EnvironmentId | null>(null)
  const firstEnv = useRef(true)
  useEffect(() => {
    if (firstEnv.current) {
      firstEnv.current = false
      return
    }
    setToast(env)
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [env])

  const flyToZone = useCallback((z: ZoneId) => {
    const cfg = ZONES.find((x) => x.id === z)!
    setZone(z)
    setFocus({ target: cfg.target, position: cfg.position, nonce: Date.now() })
  }, [])

  const select = useCallback(
    (id: SystemId) => {
      const cfg = NODES.find((n) => n.id === id)!
      // Reveal the node's layer if it was peeled away.
      const li = LAYERS.findIndex((l) => l.id === cfg.layer)
      if (li < depth) setDepth(li)
      if (hidden[cfg.layer]) setHidden((h) => ({ ...h, [cfg.layer]: false }))
      setSelected(id)
      setExpanded(false)
      setFocus({ target: cfg.pos, distance: 1.05, nonce: Date.now() })
    },
    [depth, hidden],
  )

  // First tap → HUD card. Second tap on the same node → full details.
  const onTap = useCallback(
    (id: SystemId) => {
      if (selected === id) setExpanded(true)
      else select(id)
    },
    [selected, select],
  )

  const close = useCallback(() => {
    if (expanded) setExpanded(false)
    else setSelected(null)
  }, [expanded])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Reset selection and progress when switching crew member.
  useEffect(() => {
    setSelected(null)
    setExpanded(false)
  }, [crewId])

  // Opening a system's full details counts as having reviewed it (advances the guide).
  useEffect(() => {
    if (expanded && selected) setReviewedList((r) => (r.includes(selected) ? r : [...r, selected]))
  }, [expanded, selected])

  const openProcedure = useCallback(
    (id: SystemId) => {
      select(id)
      setExpanded(true)
    },
    [select],
  )

  // Show a system when another tab asked for it (Ask HALO on Check-in → "show it on the body").
  useEffect(() => {
    if (focusRequest) select(focusRequest.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce])

  // One plain sentence telling the user what to do next.
  const hint = (() => {
    if (expanded) return 'Work through the numbered procedure. Escalate only if its conditions apply. Press ✕ or Esc to go back.'
    if (selected) return 'Read the summary, then press “Full details” for the procedure. Tap empty space to go back.'
    const next = alerts.find((a) => !reviewed.has(a.id))
    if (next) return `Next: tap the ${next.status === 'warning' ? 'red' : 'amber'} point on ${next.label.toLowerCase()} — or press “Show me” on the left.`
    return 'Nothing urgent. Tap any point to see details, or drag to look around.'
  })()

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden">
      <BodyScene
        views={views}
        statuses={statuses}
        layerVisible={layerVisible}
        selected={selected}
        expanded={expanded}
        detail={detail}
        env={env}
        priorities={priorities}
        showAllLabels={showAllLabels}
        focus={focus}
        onTap={onTap}
        onExpand={() => setExpanded(true)}
        onClose={() => setSelected(null)}
        onBackground={() => {
          setExpanded(false)
          setSelected(null)
        }}
      />

      {/* Left column: the step-by-step guide (scrolls if the screen is short) */}
      <div className="pointer-events-none absolute bottom-3 left-3 top-3 w-[310px] overflow-y-auto pb-1 [scrollbar-width:thin]">
        <GuidePanel
          env={env}
          alerts={alerts}
          priorities={priorities}
          reviewed={reviewed}
          onShow={select}
          onOpenProcedure={openProcedure}
          onCheckIn={onCheckIn}
        />
      </div>

      {/* Right: view controls, collapsed by default */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-3 top-3 flex flex-col items-end gap-2"
          >
            <div className="flex gap-2">
              <button
                onClick={() => setTourOpen(true)}
                className="glass grid h-12 w-12 place-items-center text-lg font-bold text-ink-dim hover:text-ink"
                aria-label="How to use HALO"
                title="How to use HALO"
              >
                ?
              </button>
              <button
                onClick={() => setLayersOpen((o) => !o)}
                className={`glass flex h-12 items-center gap-2 px-4 font-mono text-xs uppercase tracking-wider ${layersOpen || depth > 0 ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}
                aria-expanded={layersOpen}
              >
                ◧ Layers & view {depth > 0 && '· peeled'}
              </button>
            </div>
            <AnimatePresence>
              {layersOpen && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col items-end gap-2">
                  <LayerControl
                    detail={detail}
                    onDetail={setDetail}
                    depth={depth}
                    onDepth={setDepth}
                    hidden={hidden}
                    onToggle={(id) => setHidden((h) => ({ ...h, [id]: !h[id] }))}
                  />
                  <button
                    onClick={() => setShowAllLabels((v) => !v)}
                    className="glass flex min-h-12 w-[248px] items-center justify-between px-4 text-sm"
                    aria-pressed={showAllLabels}
                  >
                    <span>Label every system</span>
                    <span className={`font-mono text-xs ${showAllLabels ? 'text-accent' : 'text-ink-dim'}`}>{showAllLabels ? 'ON' : 'OFF'}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: zones + legend + hint */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2">
        <div className="pointer-events-auto">
          <ZonePills zone={zone} onZone={flyToZone} />
        </div>
        <p className="glass rounded-xl px-4 py-2 text-center text-sm" role="status" aria-live="polite">
          <span className="mr-2 text-accent">→</span>
          {hint}
        </p>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
          <StatusBadge status="nominal" />
          <StatusBadge status="caution" />
          <StatusBadge status="warning" />
          <span className="text-accent">◈ Priority here</span>
          <span className="hidden lg:inline">· Right-drag to rotate · Scroll to zoom · Simulated crew data</span>
        </div>
      </div>

      {/* Environment switch confirmation */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass pointer-events-none absolute bottom-[150px] left-1/2 z-30 w-[min(460px,calc(100%-24px))] -translate-x-1/2 px-4 py-3"
            role="status"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Now: {ENVIRONMENTS[toast].kind}</div>
            <div className="text-sm font-semibold">{ENVIRONMENTS[toast].label}</div>
            <div className="mt-1 text-xs text-ink-dim">
              Priority risks: {ENVIRONMENTS[toast].priorities.map((id) => SYSTEMS[id].label).join(', ')} · Earth link{' '}
              {ENVIRONMENTS[toast].groundAvailable === 'delayed' ? `${formatDelay(ENVIRONMENTS[toast].oneWayDelaySec)} one-way` : 'live'} · Escalate to{' '}
              {ENVIRONMENTS[toast].escalation.firstContact}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && selected && <DetailPanel view={views[selected]} readings={readings} env={env} onClose={() => setExpanded(false)} />}
      </AnimatePresence>

      {!expanded && (
        <AskHalo
          context={{
            environment: { kind: environment.kind, place: environment.label, gravity: environment.gravity, earthOneWaySeconds: environment.oneWayDelaySec, escalation: environment.escalation, priorities: environment.priorities, insights: environment.insights },
            crewId,
            systems: Object.values(views).map((v) => ({
              id: v.id,
              name: v.label,
              status: v.status,
              trend: v.trend,
              primary: v.primary ? { metric: v.primary.metric, value: v.primary.value, personalNormal: Math.round(v.primary.baselineMean * 10) / 10, streakDays: v.primary.streak } : null,
            })),
            selectedSystem: selected,
          }}
          onOpenSystem={select}
          onEmergency={onEmergency}
          onOpenTab={onOpenTab}
        />
      )}

      <Tour open={tourOpen} onClose={closeTour} />
    </div>
  )
}
