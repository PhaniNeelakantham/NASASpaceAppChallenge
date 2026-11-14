// TODO (C): load /public/data/donki_snapshot.json (NASA DONKI SEP + FLR events),
// show live banner during solar particle events, Theil–Sen dose forecast.
const CAREER_LIMIT_MSV = 600 // NASA career effective-dose limit
const SIMULATED_DOSE_MSV = 212

export function RadiationScreen() {
  const pct = (SIMULATED_DOSE_MSV / CAREER_LIMIT_MSV) * 100
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h2 className="text-2xl font-bold">Radiation & space weather</h2>
      <div className="rounded-xl bg-space-900 p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-ink-dim">Career dose (simulated)</span>
          <span className="font-bold">
            {SIMULATED_DOSE_MSV} / {CAREER_LIMIT_MSV} mSv
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded bg-space-800">
          <div className="h-full bg-caution" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-space-600 p-4 text-sm text-ink-dim">
        Space-weather feed (NASA DONKI) goes here — solar energetic particle events trigger the storm-shelter checklist.
      </div>
    </div>
  )
}
