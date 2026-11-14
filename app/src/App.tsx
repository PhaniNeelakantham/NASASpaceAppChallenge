import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopBar } from './components/TopBar'
import { EmergencyScreen } from './features/emergency/EmergencyScreen'
import { READINGS } from './data/syntheticCrew'
import { evaluate, systemStatus } from './engine/rules'
import { Body3DScreen } from './features/body3d/Body3DScreen'
import { CheckInScreen } from './features/checkin/CheckInScreen'
import { LearnScreen } from './features/learn/LearnScreen'
import { RadiationScreen } from './features/radiation/RadiationScreen'
import { TrendsScreen } from './features/trends/TrendsScreen'
import { ReminderToast } from './features/today/ReminderToast'
import { TodayScreen } from './features/today/TodayScreen'
import { RoutineProvider, useRoutine } from './state/routine'
import { CareScreen, type CareTool } from './features/care/CareScreen'
import { CommsProvider } from './state/comms'
import { SpaceWeatherProvider } from './state/spaceWeather'
import type { EnvironmentId } from './state/mission'

type Tab = 'body' | 'today' | 'checkin' | 'care' | 'trends' | 'radiation' | 'learn'
const TABS: { id: Tab; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'today', label: 'Today' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'care', label: 'Care' },
  { id: 'trends', label: 'Trends' },
  { id: 'radiation', label: 'Radiation' },
  { id: 'learn', label: 'Learn' },
]

/** Number of routine tasks due right now, shown on the Today tab. */
function DueDot() {
  const n = useRoutine().reminders.length
  if (!n) return null
  return (
    <span className="absolute right-[calc(50%-2.6rem)] top-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-space-950">
      {n}
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('body')
  const [env, setEnv] = useState<EnvironmentId>('transit')
  const [crewId, setCrewId] = useState('c2')
  const [night, setNight] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [careTool, setCareTool] = useState<CareTool>('photos')
  const openCare = (t: CareTool) => {
    setCareTool(t)
    setTab('care')
  }

  const readings = READINGS[crewId]
  const findings = useMemo(() => evaluate(readings), [readings])
  const statuses = useMemo(() => systemStatus(findings, readings.at(-1)?.symptoms), [findings, readings])

  return (
    <SpaceWeatherProvider>
    <CommsProvider>
    <RoutineProvider crewId={crewId}>
    <div className={`flex h-full flex-col ${night ? 'night' : ''}`}>
      <TopBar env={env} onEnv={setEnv} crewId={crewId} onCrew={setCrewId} night={night} onNight={() => setNight(!night)} onEmergency={() => setEmergency(true)} />
      <main className="relative flex-1 overflow-auto">
        {tab === 'body' && <Body3DScreen crewId={crewId} readings={readings} findings={findings} statuses={statuses} env={env} onCheckIn={() => setTab('checkin')} onEmergency={() => setEmergency(true)} />}
        {tab === 'today' && <TodayScreen statuses={statuses} env={env} onCheckIn={() => setTab('checkin')} onOpenCare={openCare} />}
        {tab === 'checkin' && <CheckInScreen onFinish={() => setTab('today')} />}
        {tab === 'care' && <CareScreen crewId={crewId} env={env} tool={careTool} onTool={setCareTool} />}
        {tab === 'trends' && <TrendsScreen readings={readings} />}
        {tab === 'radiation' && <RadiationScreen />}
        {tab === 'learn' && <LearnScreen />}
      </main>
      <nav className="grid grid-cols-7 border-t border-white/5 bg-space-950">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative min-h-14 font-mono text-xs uppercase tracking-[0.18em] transition-colors ${
              tab === t.id ? 'text-accent' : 'text-ink-dim hover:text-ink'
            }`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {tab === t.id && <span className="absolute inset-x-8 top-0 h-[2px] rounded bg-accent shadow-[0_0_12px_var(--color-accent)]" />}
            {t.label}
            {t.id === 'today' && tab !== 'today' && <DueDot />}
          </button>
        ))}
      </nav>
      {tab !== 'today' && tab !== 'body' && !emergency && <ReminderToast onOpen={() => setTab('today')} />}
      <AnimatePresence>{emergency && <EmergencyScreen env={env} userId={crewId} onClose={() => setEmergency(false)} />}</AnimatePresence>
    </div>
    </RoutineProvider>
    </CommsProvider>
    </SpaceWeatherProvider>
  )
}
