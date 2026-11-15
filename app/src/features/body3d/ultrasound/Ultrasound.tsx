import { ToneIcon } from '../../../components/ToneIcon'
import { X } from 'lucide-react'
import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { ENVIRONMENTS, formatDelay, type EnvironmentId } from '../../../state/mission'

// Self-scan guide. On the ISS, astronauts scan themselves while an expert on the ground
// watches the live image and talks them through it ("remote guidance"). Far from Earth,
// HALO gives the same step-by-step guidance on the 3D body.

type V3 = [number, number, number]

export interface UsExam {
  id: string
  label: string
  why: string
  /** Where the probe goes, on the body surface. */
  probe: V3
  /** Direction the probe points into the body (unit-ish). */
  aim: V3
  steps: string[]
  lookFor: string
}

export const EXAMS: UsExam[] = [
  {
    id: 'eye',
    label: 'Eye · optic nerve',
    why: 'Fluid shift can swell the optic nerve and flatten the back of the eye (SANS). An ultrasound shows it before vision changes.',
    probe: [0.033, 1.69, 0.115],
    aim: [0, 0, -1],
    steps: [
      'Close your eye and cover the eyelid with a thick layer of gel (protects the eye).',
      'Rest the probe very lightly on the closed lid, marker pointing to your ear. No pressure.',
      'Look straight ahead behind the closed lid. Find the dark band behind the eye: the optic nerve sheath.',
      'Freeze the image and measure the sheath width 3 mm behind the eye.',
      'Save the clip, then repeat on the other eye.',
    ],
    lookFor: 'Optic nerve sheath wider than your preflight baseline, or a flattened back of the eye.',
  },
  {
    id: 'jugular',
    label: 'Neck · jugular vein',
    why: 'An ISS study found slow or even reversed blood flow (and some clots) in astronauts’ neck veins. Scans catch this early.',
    probe: [-0.045, 1.55, 0.06],
    aim: [0, 0, -1],
    steps: [
      'Turn your head slightly to the left. Apply gel to the right side of your neck.',
      'Place the probe across the neck, halfway between jaw and collarbone, marker pointing right.',
      'Find the round dark circle that squashes when you press gently: that is the jugular vein.',
      'Press gently. A healthy vein flattens fully. Save the clip.',
      'Rotate the probe along the vein and save a second clip.',
    ],
    lookFor: 'A vein that does not squash when pressed (possible clot). Report to the flight surgeon.',
  },
  {
    id: 'heart',
    label: 'Heart',
    why: 'The heart changes shape and size after months without gravity. A quick view tracks how well it is pumping.',
    probe: [0.06, 1.27, 0.14],
    aim: [-0.2, 0, -1],
    steps: [
      'Apply gel just left of your breastbone, about a hand-width below the collarbone.',
      'Place the probe flat with the marker pointing toward your right shoulder.',
      'Breathe out and hold. Tilt the probe slowly until you see all four heart chambers moving.',
      'Record a 5-second clip.',
      'Breathe normally and save.',
    ],
    lookFor: 'Weak pumping, fluid around the heart, or chambers much larger than your baseline.',
  },
  {
    id: 'bladder',
    label: 'Bladder',
    why: 'Without gravity some astronauts can’t fully empty the bladder in the first days, which raises infection risk.',
    probe: [0, 0.93, 0.12],
    aim: [0, -0.3, -1],
    steps: [
      'Use the toilet first.',
      'Apply gel just above the pubic bone.',
      'Place the probe across the body, angle it slightly down toward your feet.',
      'Find the dark, balloon-shaped bladder. Measure its width and depth.',
      'Save the image.',
    ],
    lookFor: 'A lot of urine left after using the toilet.',
  },
  {
    id: 'kidney',
    label: 'Kidney',
    why: 'Calcium released from weakening bones raises the risk of kidney stones.',
    probe: [-0.15, 1.08, -0.02],
    aim: [1, 0, 0],
    steps: [
      'Apply gel to your right side, below the ribs, in line with your armpit.',
      'Place the probe along the body, marker pointing toward your head.',
      'Breathe in and hold. Find the bean-shaped kidney.',
      'Scan slowly through it, front to back. Save the clip.',
    ],
    lookFor: 'Bright white spots with a dark shadow behind them (stones), or a swollen kidney.',
  },
]

export function ProbeMarker({ exam }: { exam: UsExam }) {
  const ring = useRef<THREE.Mesh>(null)
  const dir = new THREE.Vector3(...exam.aim).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)
  useFrame(({ clock }) => {
    const m = ring.current
    if (!m) return
    const t = (clock.getElapsedTime() * 0.8) % 1
    m.scale.setScalar(1 + t * 1.8)
    ;(m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t)
  })
  return (
    <group position={exam.probe}>
      {/* Probe body sits just outside the skin, pointing in. */}
      <group quaternion={q}>
        <mesh position={[0, 0.035, 0]} renderOrder={22}>
          <cylinderGeometry args={[0.006, 0.009, 0.045, 16]} />
          <meshBasicMaterial color="#7dd3fc" depthTest={false} transparent opacity={0.9} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.008, 0]} renderOrder={22}>
          <boxGeometry args={[0.018, 0.008, 0.009]} />
          <meshBasicMaterial color="#e6edf8" depthTest={false} transparent opacity={0.95} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ring} quaternion={q} renderOrder={21}>
        <torusGeometry args={[0.012, 0.0015, 8, 32]} />
        <meshBasicMaterial color="#7dd3fc" depthTest={false} transparent toneMapped={false} />
      </mesh>
      <Html zIndexRange={[24, 21]} style={{ pointerEvents: 'none' }}>
        <div className="translate-x-4 -translate-y-1/2 whitespace-nowrap rounded-md border border-accent/50 bg-space-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
          PROBE HERE
        </div>
      </Html>
    </group>
  )
}

export function UltrasoundPanel({
  exam,
  step,
  env,
  onExam,
  onStep,
  onClose,
}: {
  exam: UsExam | null
  step: number
  env: EnvironmentId
  onExam: (e: UsExam | null) => void
  onStep: (n: number) => void
  onClose: () => void
}) {
  const e = ENVIRONMENTS[env]
  const live = e.groundAvailable !== 'delayed'
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass flex max-h-[calc(100vh-290px)] w-[340px] flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]">
      <div className="flex items-center justify-between">
        <span className="section-h !mb-0">Ultrasound self-scan{exam ? ` · ${exam.label}` : ''}</span>
        <button onClick={onClose} className="font-mono text-xs uppercase text-ink-dim hover:text-ink" aria-label="Close">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      {!exam ? (
        <>
          <p className="text-sm text-ink-dim">Pick a scan. HALO shows where to put the probe and walks you through each step.</p>
          <div className="flex flex-col gap-2">
            {EXAMS.map((x) => (
              <button key={x.id} onClick={() => onExam(x)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-accent/50">
                <div className="font-semibold">{x.label}</div>
                <div className="text-xs text-ink-dim">{x.why}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-ink-dim">{exam.why}</p>
          <div className="flex gap-1">
            {exam.steps.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="min-h-[88px] rounded-xl bg-black/25 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Step {step + 1} of {exam.steps.length}
            </div>
            <p className="mt-1">{exam.steps[step]}</p>
          </div>
          {step === exam.steps.length - 1 && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="rounded-lg bg-caution/10 p-2 text-xs text-caution"><ToneIcon tone="caution" /> Look for: {exam.lookFor}</p>
              <p className="text-xs text-ink-dim">
                {live
                  ? 'Ground can watch this scan live: a flight surgeon can guide you in real time.'
                  : `Ground is ${formatDelay(e.oneWayDelaySec)} away: save your clips and send them. Expect a reply in about ${formatDelay(e.oneWayDelaySec * 2)} or more.`}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => (step === 0 ? onExam(null) : onStep(step - 1))} className="min-h-11 flex-1 rounded-lg bg-space-800 text-sm">
              {step === 0 ? 'All scans' : 'Back'}
            </button>
            {step < exam.steps.length - 1 ? (
              <button onClick={() => onStep(step + 1)} className="min-h-11 flex-[2] rounded-lg bg-accent text-sm font-semibold text-space-950">
                Next step
              </button>
            ) : (
              <button onClick={onClose} className="min-h-11 flex-[2] rounded-lg bg-nominal text-sm font-semibold text-space-950">
                Done · clip saved
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
