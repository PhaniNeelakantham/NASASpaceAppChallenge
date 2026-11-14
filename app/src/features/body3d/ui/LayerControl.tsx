import type { Detail } from '../anatomy/models'
import { LAYERS, type LayerId } from '../theme'

const DETAILS: { id: Detail; label: string; hint: string }[] = [
  { id: 'low', label: 'Low', hint: 'Lighter meshes, no glow — fastest' },
  { id: 'medium', label: 'Medium', hint: 'Full meshes, no glow' },
  { id: 'high', label: 'High', hint: 'Full meshes, glow, sharper render' },
]

interface Props {
  detail: Detail
  onDetail: (d: Detail) => void
  depth: number
  onDepth: (d: number) => void
  hidden: Record<LayerId, boolean>
  onToggle: (id: LayerId) => void
}

/**
 * Vertical "peel" track: tapping a stop strips every layer above it.
 * Each layer also has its own show/hide toggle. All targets ≥ 48 px.
 */
export function LayerControl({ detail, onDetail, depth, onDepth, hidden, onToggle }: Props) {
  const di = DETAILS.findIndex((d) => d.id === detail)
  return (
    <div className="glass w-[248px] p-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Layers · peel</span>
        {depth > 0 && (
          <button className="font-mono text-[10px] uppercase tracking-wider text-accent" onClick={() => onDepth(0)}>
            Reset
          </button>
        )}
      </div>
      <div className="relative">
        {/* track */}
        <div className="absolute bottom-6 left-[23px] top-6 w-[2px] rounded bg-white/10" />
        <div
          className="absolute left-[23px] top-6 w-[2px] rounded bg-accent/70 transition-all duration-500"
          style={{ height: `calc(${(depth / (LAYERS.length - 1)) * 100}% - ${(depth / (LAYERS.length - 1)) * 48}px)` }}
        />
        <ul className="relative flex flex-col gap-1">
          {LAYERS.map((l, i) => {
            const peeled = i < depth
            const off = hidden[l.id]
            const showing = !peeled && !off
            return (
              <li key={l.id} className="flex items-center gap-1">
                <button
                  onClick={() => onDepth(i)}
                  className="flex min-h-12 flex-1 items-center gap-3 rounded-xl pr-2 text-left transition-colors hover:bg-white/5"
                  aria-pressed={depth === i}
                  title={`Peel down to ${l.label}`}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center">
                    <span
                      className="block rounded-full border-2 transition-all duration-300"
                      style={{
                        width: depth === i ? 22 : 14,
                        height: depth === i ? 22 : 14,
                        borderColor: l.color,
                        background: showing ? l.color : 'transparent',
                        boxShadow: showing ? `0 0 14px ${l.color}` : 'none',
                        opacity: peeled ? 0.35 : 1,
                      }}
                    />
                  </span>
                  <span className={peeled ? 'opacity-40' : ''}>
                    <span className="block text-sm font-semibold leading-tight">{l.label}</span>
                    <span className="block text-[11px] leading-tight text-ink-dim">{l.sub}</span>
                  </span>
                </button>
                <button
                  onClick={() => onToggle(l.id)}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg text-ink-dim hover:bg-white/5 disabled:opacity-25"
                  disabled={peeled}
                  aria-label={`${off ? 'Show' : 'Hide'} ${l.label}`}
                  aria-pressed={!off}
                >
                  {off ? '◌' : '◉'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-3 border-t border-white/5 px-1 pt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">Model detail</span>
          <span className="font-mono text-[10px] text-accent">{DETAILS[di].label}</span>
        </div>
        <input
          type="range"
          min={0}
          max={DETAILS.length - 1}
          step={1}
          value={di}
          onChange={(e) => onDetail(DETAILS[Number(e.target.value)].id)}
          className="detail-slider h-12 w-full cursor-pointer"
          aria-label="Model detail"
          aria-valuetext={DETAILS[di].label}
        />
        <div className="grid grid-cols-3">
          {DETAILS.map((d) => (
            <button
              key={d.id}
              onClick={() => onDetail(d.id)}
              className={`min-h-10 rounded-lg font-mono text-[10px] uppercase tracking-wider ${d.id === detail ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="px-1 text-[11px] leading-tight text-ink-dim">{DETAILS[di].hint}</p>
      </div>
    </div>
  )
}
