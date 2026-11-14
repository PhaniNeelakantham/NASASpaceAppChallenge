import { useRef, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ENVIRONMENTS, type EnvironmentId } from '../../../state/mission'
import type { Status, SystemId } from '../../../types'
import { CardioLayer, MusculoLayer, OrgansLayer, SkinLayer } from '../anatomy/layers'
import type { Detail } from '../anatomy/models'
import type { SystemView } from '../health'
import { HealthNode } from '../nodes/HealthNode'
import { NODES } from '../nodes/nodeConfig'
import type { LayerId } from '../theme'
import { CameraRig, type Focus } from './CameraRig'

export interface BodySceneProps {
  views: Record<SystemId, SystemView>
  statuses: Record<SystemId, Status>
  layerVisible: Record<LayerId, boolean>
  selected: SystemId | null
  expanded: boolean
  detail: Detail
  env: EnvironmentId
  priorities: Set<SystemId>
  showAllLabels: boolean
  focus: Focus | null
  onTap: (id: SystemId) => void
  /** Extra 3D content (pain markers, ultrasound probe). */
  children?: ReactNode
  onExpand: () => void
  onClose: () => void
  onBackground: () => void
}

export function BodyScene(p: BodySceneProps) {
  const down = useRef<{ x: number; y: number } | null>(null)
  const visibleIds = new Set(NODES.filter((n) => p.layerVisible[n.layer]).map((n) => n.id))
  const layer = { statuses: p.statuses, selected: p.selected, detail: p.detail }

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0, 1.05, 3.6], fov: 38, near: 0.05, far: 50 }}
        dpr={p.detail === 'high' ? [1, 2] : 1}
        gl={{ antialias: p.detail !== 'low', powerPreference: 'high-performance' }}
        onPointerMissed={(e) => {
          const d = down.current
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) p.onBackground()
        }}
      >
        <color attach="background" args={['#030712']} />
        <CameraRig focus={p.focus} shiftX={p.expanded ? 230 : 0} />

        <SkinLayer visible={p.layerVisible.skin} {...layer} />
        <MusculoLayer visible={p.layerVisible.musculo} {...layer} />
        <CardioLayer visible={p.layerVisible.cardio} {...layer} />
        <OrgansLayer visible={p.layerVisible.organs} {...layer} />
        {NODES.map((cfg) => (
          <HealthNode
            key={cfg.id}
            cfg={cfg}
            view={p.views[cfg.id]}
            visible={visibleIds.has(cfg.id)}
            selected={p.selected === cfg.id}
            expanded={p.expanded}
            dimmed={p.selected !== null && p.selected !== cfg.id}
            priority={p.priorities.has(cfg.id)}
            insight={ENVIRONMENTS[p.env].insights[cfg.id]}
            envKind={ENVIRONMENTS[p.env].kind}
            showAllLabels={p.showAllLabels}
            onTap={p.onTap}
            onExpand={p.onExpand}
            onClose={p.onClose}
          />
        ))}

        {p.children}

        {/* Glow only at High detail. */}
        {p.detail === 'high' && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.26} luminanceSmoothing={0.3} radius={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
