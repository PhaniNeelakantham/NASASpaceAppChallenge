import { useState } from 'react'
import { SYSTEM_LIST } from '../../content/systems'
import { MeasureGuides } from './MeasureGuides'

type Section = 'systems' | 'measure'
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'systems', label: 'Body systems' },
  { id: 'measure', label: 'How to measure' },
]

export function LearnScreen() {
  const [section, setSection] = useState<Section>('systems')

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            aria-pressed={section === s.id}
            className={`min-h-11 rounded-full border px-4 text-xs font-mono uppercase tracking-[0.12em] ${
              section === s.id ? 'border-accent text-accent' : 'border-white/10 text-ink-dim hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'systems' && (
        <div className="grid gap-4 md:grid-cols-2">
          {SYSTEM_LIST.map((s) => (
            <article key={s.id} className="rounded-xl bg-space-900 p-4">
              <h2 className="font-bold">{s.label}</h2>
              <p className="text-xs text-accent">{s.hrpRisk}</p>
              <p className="mt-2 text-sm">{s.whyInSpace}</p>
            </article>
          ))}
        </div>
      )}
      {section === 'measure' && <MeasureGuides />}
    </div>
  )
}
