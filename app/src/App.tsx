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
import { CommsProvider } from './state/comms'
import { SpaceWeatherProvider } from './state/spaceWeather'
import type { EnvironmentId } from './state/mission'

type Tab = 'body' | 'checkin' | 'trends' | 'radiation' | 'learn'
const TABS: { id: Tab; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'trends', label: 'Trends' },
  { id: 'radiation', label: 'Radiation' },
  { id: 'learn', label: 'Learn' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('body')
  const [env, setEnv] = useState<EnvironmentId>('transit')
  const [crewId, setCrewId] = useState('c2')
  const [night, setNight] = useState(false)
  const [emergency, setEmergency] = useState(false)

  const readings = READINGS[crewId]
  const findings = useMemo(() => evaluate(readings), [readings])
  const statuses = useMemo(() => systemStatus(findings, readings.at(-1)?.symptoms), [findings, readings])

  return (
    <SpaceWeatherProvider>
    <CommsProvider>
    <div className={`flex h-full flex-col ${night ? 'night' : ''}`}>
      <TopBar env={env} onEnv={setEnv} crewId={crewId} onCrew={setCrewId} night={night} onNight={() => setNight(!night)} onEmergency={() => setEmergency(true)} />
      <main className="relative flex-1 overflow-auto">
        {tab === 'body' && <Body3DScreen crewId={crewId} readings={readings} findings={findings} statuses={statuses} env={env} onCheckIn={() => setTab('checkin')} />}
        {tab === 'checkin' && <CheckInScreen />}
        {tab === 'trends' && <TrendsScreen readings={readings} />}
        {tab === 'radiation' && <RadiationScreen />}
        {tab === 'learn' && <LearnScreen />}
      </main>
      <nav className="grid grid-cols-5 border-t border-white/5 bg-space-950">
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
          </button>
        ))}
      </nav>
      <AnimatePresence>{emergency && <EmergencyScreen env={env} userId={crewId} onClose={() => setEmergency(false)} />}</AnimatePresence>
    </div>
    </CommsProvider>
    </SpaceWeatherProvider>
  )
}
