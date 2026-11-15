import { BriefcaseMedical, Camera, Grid3x3, NotebookPen, PlaneLanding, Users, type LucideIcon } from 'lucide-react'
import type { EnvironmentId } from '../../state/mission'
import { BuddyCheck } from './BuddyCheck'
import { Journal } from './Journal'
import { LandingTest } from './LandingTest'
import { MedKit } from './MedKit'
import { PhotoLog } from './PhotoLog'
import { VisionTest } from './VisionTest'

export type CareTool = 'photos' | 'vision' | 'buddy' | 'journal' | 'medkit' | 'landing'

const TOOLS: { id: CareTool; label: string; icon: LucideIcon; blurb: string; hazard: string }[] = [
  { id: 'photos', label: 'Skin photos', icon: Camera, blurb: 'Photograph a rash or bruise daily and compare.', hazard: 'Closed environment' },
  { id: 'vision', label: 'Vision test', icon: Grid3x3, blurb: 'Amsler grid: catch eye changes early.', hazard: 'Gravity' },
  { id: 'buddy', label: 'Buddy check', icon: Users, blurb: 'Rate how your crewmates seem, and see how they see you.', hazard: 'Isolation' },
  { id: 'journal', label: 'Journal & Earth', icon: NotebookPen, blurb: 'Private journal and your next call home.', hazard: 'Distance' },
  { id: 'medkit', label: 'Med kit', icon: BriefcaseMedical, blurb: 'Stock, expiry and dose log for the onboard kit.', hazard: 'Radiation' },
  { id: 'landing', label: 'Landing readiness', icon: PlaneLanding, blurb: 'Lying-to-standing test before landing.', hazard: 'Gravity' },
]

export function CareScreen({ crewId, env, tool, onTool }: { crewId: string; env: EnvironmentId; tool: CareTool; onTool: (t: CareTool) => void }) {
  const t = TOOLS.find((x) => x.id === tool)!
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6">
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Care tools">
        {TOOLS.map((x) => (
          <button
            key={x.id}
            onClick={() => onTool(x.id)}
            className={`glass flex min-h-16 flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${tool === x.id ? 'border-accent/60 text-accent' : 'text-ink-dim hover:text-ink'}`}
            aria-current={tool === x.id ? 'page' : undefined}
          >
            <x.icon aria-hidden className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">{x.label}</span>
          </button>
        ))}
      </nav>
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-2xl font-bold">{t.label}</h2>
        <span className="text-sm text-ink-dim">{t.blurb}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">Hazard: {t.hazard}</span>
      </header>
      {tool === 'photos' && <PhotoLog crewId={crewId} />}
      {tool === 'vision' && <VisionTest crewId={crewId} />}
      {tool === 'buddy' && <BuddyCheck crewId={crewId} />}
      {tool === 'journal' && <Journal crewId={crewId} env={env} />}
      {tool === 'medkit' && <MedKit crewId={crewId} env={env} />}
      {tool === 'landing' && <LandingTest crewId={crewId} env={env} />}
    </div>
  )
}
