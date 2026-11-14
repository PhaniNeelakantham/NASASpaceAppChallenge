import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { PROXIES, refineRegion, severityColor, type PainReport, type Proxy, type RegionId, type Side } from './painContent'

const HIDDEN = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16)

function ProxyMesh({ p, onPick }: { p: Proxy; onPick: (pos: [number, number, number], region: RegionId, side?: Side) => void }) {
  const geom = useMemo(() => {
    if (p.kind === 'sphere') return null
    const a = new THREE.Vector3(...p.a)
    const b = new THREE.Vector3(...p.b)
    const len = a.distanceTo(b)
    const g = new THREE.CapsuleGeometry(p.r, len, 6, 12)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    g.applyQuaternion(q)
    const mid = a.add(b).multiplyScalar(0.5)
    g.translate(mid.x, mid.y, mid.z)
    return g
  }, [p])

  const click = (e: ThreeEvent<MouseEvent>) => {
    // Ignore the end of a drag (rotating the view), only real taps count.
    if (e.delta > 6) return
    e.stopPropagation()
    const pt = e.point
    onPick([pt.x, pt.y, pt.z], refineRegion(p.region, pt.z), p.side)
  }
  const over = () => (document.body.style.cursor = 'crosshair')
  const out = () => (document.body.style.cursor = '')

  if (p.kind === 'sphere') {
    return <mesh geometry={UNIT_SPHERE} material={HIDDEN} position={p.center} scale={p.scale} onClick={click} onPointerOver={over} onPointerOut={out} />
  }
  return <mesh geometry={geom!} material={HIDDEN} onClick={click} onPointerOver={over} onPointerOut={out} />
}

function Marker({ pos, severity, label, selected, onSelect }: { pos: [number, number, number]; severity: number; label: string; selected: boolean; onSelect?: () => void }) {
  const ring = useRef<THREE.Mesh>(null)
  const color = severityColor(severity)
  useFrame(({ clock }) => {
    const m = ring.current
    if (!m) return
    const t = (clock.getElapsedTime() * 0.9) % 1
    m.scale.setScalar(1 + t * 2.2)
    ;(m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t)
  })
  return (
    <group position={pos}>
      <mesh
        renderOrder={20}
        onClick={(e) => {
          if (!onSelect) return
          e.stopPropagation()
          onSelect()
        }}
      >
        <sphereGeometry args={[selected ? 0.014 : 0.011, 16, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
      </mesh>
      <mesh ref={ring} renderOrder={19}>
        <sphereGeometry args={[0.011, 16, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <Html zIndexRange={[24, 21]} style={{ pointerEvents: 'none' }}>
        <div
          className="-translate-y-[150%] translate-x-3 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{ color, borderColor: `${color}66`, background: 'rgba(3,7,18,0.8)' }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

export interface PainSpot {
  spot: string
  latest: PainReport
  history: PainReport[]
}

export function PainLayer({
  mode,
  spots,
  draft,
  selectedSpot,
  onPick,
  onSelectSpot,
}: {
  mode: boolean
  spots: PainSpot[]
  draft: { pos: [number, number, number]; severity: number } | null
  selectedSpot: string | null
  onPick: (pos: [number, number, number], region: RegionId, side?: Side) => void
  onSelectSpot: (spot: string) => void
}) {
  return (
    <group>
      {mode && PROXIES.map((p, i) => <ProxyMesh key={i} p={p} onPick={onPick} />)}
      {spots.map((s) => (
        <Marker
          key={s.spot}
          pos={s.latest.pos}
          severity={s.latest.severity}
          label={`PAIN ${s.latest.severity}/10`}
          selected={selectedSpot === s.spot}
          onSelect={() => onSelectSpot(s.spot)}
        />
      ))}
      {draft && <Marker pos={draft.pos} severity={draft.severity} label="NEW" selected />}
    </group>
  )
}
