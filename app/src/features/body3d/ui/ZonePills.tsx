import { ZONES, type ZoneId } from '../nodes/nodeConfig'

/** Single-tap anatomical zones — no pinpoint pinching needed. */
export function ZonePills({ zone, onZone }: { zone: ZoneId; onZone: (z: ZoneId) => void }) {
  return (
    <div className="glass flex flex-wrap justify-center gap-1 p-1.5" onPointerDown={(e) => e.stopPropagation()}>
      {ZONES.map((z) => (
        <button
          key={z.id}
          onClick={() => onZone(z.id)}
          className={`min-h-12 min-w-12 rounded-xl px-4 font-mono text-xs uppercase tracking-wider transition-all ${
            zone === z.id ? 'bg-accent/20 text-accent shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
          }`}
        >
          {z.label}
        </button>
      ))}
    </div>
  )
}
