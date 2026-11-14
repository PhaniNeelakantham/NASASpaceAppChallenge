import { useMemo, useRef, useState } from 'react'
import { Billboard, Html, Line } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { SystemId } from '../../../types'
import type { SystemView } from '../health'
import { damp, STATUS_HEX } from '../theme'
import { HudCard } from './HudCard'
import type { NodeCfg } from './nodeConfig'

interface Props {
  cfg: NodeCfg
  view: SystemView
  visible: boolean
  selected: boolean
  expanded: boolean
  dimmed: boolean
  /** Priority risk in the current environment. */
  priority: boolean
  insight?: string
  envKind: string
  /** Show the text label even when the system is healthy (otherwise healthy nodes stay as quiet dots). */
  showAllLabels: boolean
  onTap: (id: SystemId) => void
  onExpand: () => void
  onClose: () => void
}

const SAT_RADIUS = 0.15
const tmp = new THREE.Vector3()
/** Distance at which nodes render at their designed size. */
const DESIGN_DIST = 3.6

export function HealthNode({ cfg, view, visible, selected, expanded, dimmed, priority, insight, envKind, showAllLabels, onTap, onExpand, onClose }: Props) {
  const [hover, setHover] = useState(false)
  const root = useRef<THREE.Group>(null)
  const pulse = useRef<THREE.Mesh>(null)
  const pulse2 = useRef<THREE.Mesh>(null)
  const sats = useRef<THREE.Group>(null)
  const fade = useRef(visible ? 1 : 0)
  const grow = useRef(0)
  const open = useRef(0)

  const color = STATUS_HEX[view.status]
  const alert = view.status === 'caution' || view.status === 'warning'
  const active = hover || selected

  const satellites = useMemo(() => {
    const n = view.indicators.length
    return view.indicators.map((ind, i) => {
      const a = Math.PI / 2 + (i / n) * Math.PI * 2
      return { ...ind, p: [Math.cos(a) * SAT_RADIUS, Math.sin(a) * SAT_RADIUS, 0] as [number, number, number] }
    })
  }, [view.indicators])

  useFrame(({ clock, camera }, dt) => {
    if (!root.current) return
    fade.current = damp(fade.current, visible ? 1 : 0, 7, dt)
    grow.current = damp(grow.current, active ? 1 : 0, 9, dt)
    open.current = damp(open.current, active ? 1 : 0, 6, dt)
    const f = fade.current
    root.current.visible = f > 0.02
    // Keep nodes roughly constant on screen when zooming in (floor keeps the tap target ≥ 48 px).
    root.current.getWorldPosition(tmp)
    const zoom = THREE.MathUtils.clamp(camera.position.distanceTo(tmp) / DESIGN_DIST, 0.3, 1)
    root.current.scale.setScalar(Math.max(f, 0.001) * (1 + grow.current * 0.35) * zoom)

    // Attention pulse — only for Caution/Warning (faster for Warning). Nominal nodes stay still.
    const speed = view.status === 'warning' ? 1.4 : 0.8
    const t = clock.elapsedTime * speed
    for (const [mesh, offset, reach] of [
      [pulse.current, 0, 2.2],
      [pulse2.current, 0.5, 2.2],
    ] as const) {
      if (!mesh) continue
      mesh.visible = alert
      if (!alert) continue
      const p = (t + offset) % 1
      mesh.scale.setScalar(1 + p * reach)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.8 * (dimmed ? 0.4 : 1)
    }
    if (sats.current) {
      sats.current.scale.setScalar(Math.max(open.current, 0.001))
      sats.current.visible = open.current > 0.02
    }
  })

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return // it was a drag, not a tap
    e.stopPropagation()
    onTap(cfg.id)
  }

  const basic = { transparent: true, depthTest: false, depthWrite: false, toneMapped: false } as const

  return (
    <group position={cfg.pos}>
      <group ref={root}>
        <Billboard>
          {/* attention pulse (alerts only) */}
          <mesh ref={pulse} renderOrder={20}>
            <ringGeometry args={[0.021, 0.024, 48]} />
            <meshBasicMaterial color={color} {...basic} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={pulse2} renderOrder={20}>
            <ringGeometry args={[0.021, 0.024, 48]} />
            <meshBasicMaterial color={color} {...basic} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* priority-in-this-environment marker: static accent diamond ring */}
          {priority && (
            <mesh renderOrder={21} rotation={[0, 0, Math.PI / 4]}>
              <ringGeometry args={[0.04, 0.043, 4]} />
              <meshBasicMaterial color="#7dd3fc" {...basic} opacity={dimmed ? 0.3 : 0.9} />
            </mesh>
          )}
          {/* selection ring (feedback, static) */}
          {active && (
            <mesh renderOrder={21}>
              <ringGeometry args={[0.032, 0.035, 48]} />
              <meshBasicMaterial color={color} {...basic} opacity={0.8} />
            </mesh>
          )}
          {/* glow + core */}
          <mesh renderOrder={22}>
            <circleGeometry args={[0.026, 40]} />
            <meshBasicMaterial color={color} {...basic} opacity={dimmed ? 0.06 : alert || active ? 0.22 : 0.06} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh renderOrder={23} scale={alert || active ? 1 : 0.7}>
            <circleGeometry args={[0.012, 32]} />
            <meshBasicMaterial color={dimmed ? '#475569' : color} {...basic} />
          </mesh>
          <mesh renderOrder={24}>
            <circleGeometry args={[0.005, 24]} />
            <meshBasicMaterial color="#ffffff" {...basic} opacity={0.9} />
          </mesh>

          {/* satellite indicators, network-graph style */}
          <group ref={sats}>
            {satellites.map((s) => (
              <group key={s.label}>
                <Line points={[[0, 0, 0], s.p]} color={STATUS_HEX[s.status]} lineWidth={1} transparent opacity={0.55} depthTest={false} renderOrder={19} />
                <mesh position={s.p} renderOrder={25}>
                  <circleGeometry args={[0.0075, 20]} />
                  <meshBasicMaterial color={STATUS_HEX[s.status]} {...basic} />
                </mesh>
                {selected && (
                  <Html position={s.p} zIndexRange={[25, 20]} style={{ pointerEvents: 'none' }}>
                    <div className="sat-label" style={{ color: STATUS_HEX[s.status] }}>
                      <span className="text-ink">{s.label}</span>
                      {s.value && <span className="ml-1 opacity-80">{s.value}</span>}
                    </div>
                  </Html>
                )}
              </group>
            ))}
          </group>

          {/* generous invisible hit target (gloved hands) */}
          <mesh
            onClick={tap}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHover(true)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setHover(false)
              document.body.style.cursor = ''
            }}
          >
            <circleGeometry args={[0.065, 24]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
          </mesh>
        </Billboard>
      </group>

      {/* label: only for issues, environment priorities, hover/selection — or when the user asks for all */}
      {visible && (alert || priority || active || showAllLabels) && (
        <Html zIndexRange={[30, 26]} style={{ pointerEvents: 'none' }}>
          <button
            className={`node-label ${cfg.pos[0] < -0.03 ? 'node-label-left' : ''} ${dimmed ? 'opacity-35' : ''} ${active ? 'node-label-active' : ''}`}
            style={{ ['--node' as string]: color }}
            onClick={(e) => {
              e.stopPropagation() // keep the canvas from treating this as a background click
              onTap(cfg.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
          >
            {priority && <span className="text-accent">◈</span>}
            <span>{cfg.tag}</span>
            <span className="node-count">{view.indicators.length}</span>
          </button>
        </Html>
      )}

      {selected && visible && !expanded && (
        <Html zIndexRange={[60, 50]} style={{ pointerEvents: 'none' }}>
          <HudCard view={view} insight={insight} envKind={envKind} priority={priority} onExpand={onExpand} onClose={onClose} />
        </Html>
      )}
    </group>
  )
}
