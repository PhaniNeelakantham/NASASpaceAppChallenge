import { SYSTEM_LIST } from '../../content/systems'

export function LearnScreen() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-6 md:grid-cols-2">
      {SYSTEM_LIST.map((s) => (
        <article key={s.id} className="rounded-xl bg-space-900 p-4">
          <h2 className="font-bold">{s.label}</h2>
          <p className="text-xs text-accent">{s.hrpRisk}</p>
          <p className="mt-2 text-sm">{s.whyInSpace}</p>
        </article>
      ))}
    </div>
  )
}
