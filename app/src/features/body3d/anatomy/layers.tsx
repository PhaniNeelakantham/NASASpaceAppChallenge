import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Status, SystemId } from '../../../types'
import { ANATOMY, STATUS_HEX, tint } from '../theme'
import { J, SIDES, SPINE } from './bodyPlan'
import { Blob, LOW_SPHERE, noRaycast, Tube } from './geometry'
import { holo, setTarget, useLayerMaterials, useMaterials } from './materials'
import { ModelMesh, modelUrl, type Detail } from './models'

export interface LayerProps {
  visible: boolean
  statuses: Record<SystemId, Status>
  selected: SystemId | null
  detail: Detail
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** 1.795 m (skin top minus scalp) ÷ 1.750 m (skeleton model height), measured from the GLB vertices. */
const SKELETON_Y_FIT = 1.795 / 1.75

/** Boost the selected system's materials so its anatomy "lights up"; dim the rest. */
function boostFor(selected: SystemId | null, owner: Map<THREE.Material, SystemId>) {
  return (m: THREE.Material) => (selected && owner.get(m) === selected ? 2.4 : selected ? 0.55 : 1)
}

// Deterministic rash spot positions on the front surface of the left forearm + shoulder.
const RASH_SPOTS: THREE.Vector3[] = (() => {
  const pts: THREE.Vector3[] = []
  let seed = 7
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 14; i++) {
    const t = r()
    // along the forearm, elbow → wrist, on its front face
    pts.push(v(0.33 + t * 0.07 + (r() - 0.5) * 0.02, 1.09 - t * 0.11 + (r() - 0.5) * 0.02, 0.012 + r() * 0.01))
  }
  for (let i = 0; i < 6; i++) pts.push(v(0.215 + (r() - 0.5) * 0.04, 1.4 + (r() - 0.5) * 0.04, 0.072 + r() * 0.008))
  return pts
})()

/* ------------------------------------------------------------------ */
/* Layer 1: Skin / surface: the muscle model inflated into a shell     */
/* ------------------------------------------------------------------ */

export function SkinLayer({ visible, statuses, selected, detail }: LayerProps) {
  const m = useMaterials(() => ({
    shell: holo({ color: ANATOMY.skin, base: 0.006, rim: 0.5, power: 3.0, inflate: 0.007 }),
    patch: holo({ color: STATUS_HEX.caution, base: 0.9, rim: 1.0, power: 1.0 }),
    pressure: holo({ color: ANATOMY.skin, base: 0.05, rim: 0.4, power: 1.5 }),
  }))
  const s = statuses.skin
  useEffect(() => setTarget(m.patch, STATUS_HEX[s === 'warning' ? 'warning' : 'caution']), [m, s])
  const owner = useMemo(() => new Map<THREE.Material, SystemId>([[m.shell, 'skin'], [m.pressure, 'skin']]), [m])
  const group = useLayerMaterials(Object.values(m), visible, boostFor(selected, owner))
  const rash = s === 'caution' || s === 'warning'
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <ModelMesh url={modelUrl('muscles', detail)} materials={[m.shell]} />
      </Suspense>
      {/* EVA suit pressure points: shoulders, knuckles, toes */}
      {SIDES.map((sd) => (
        <group key={sd}>
          <Blob position={v(0.2 * sd, 1.475, -0.02)} radii={[0.035, 0.012, 0.035]} materials={[m.pressure]} />
          <Blob position={v(0.465 * sd, 0.83, 0.0)} radii={[0.02, 0.014, 0.01]} materials={[m.pressure]} />
          <Blob position={v(0.15 * sd, 0.035, 0.12)} radii={[0.03, 0.012, 0.02]} materials={[m.pressure]} />
        </group>
      ))}
      {/* Reported rash: a scatter of small glowing spots on the left forearm and shoulder */}
      {rash && RASH_SPOTS.map((p, i) => <Blob key={i} position={p} radii={[0.007, 0.007, 0.004]} materials={[m.patch]} geometry={LOW_SPHERE} />)}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Layer 2: Musculoskeletal: downloaded muscle + skeleton models        */
/* ------------------------------------------------------------------ */

export function MusculoLayer({ visible, statuses, selected, detail }: LayerProps) {
  const m = useMaterials(() => ({
    muscle: holo({ color: ANATOMY.muscle, base: 0.014, rim: 0.58, power: 1.9 }),
    bone: holo({ color: ANATOMY.bone, base: 0.03, rim: 0.75, power: 1.7 }),
  }))
  const bones = statuses.bones
  const muscle = statuses.muscle
  useEffect(() => {
    setTarget(m.bone, tint(bones, ANATOMY.bone))
    setTarget(m.muscle, tint(muscle, ANATOMY.muscle))
  }, [m, bones, muscle])
  const owner = useMemo(
    () =>
      new Map<THREE.Material, SystemId>([
        [m.bone, 'bones'],
        [m.muscle, 'muscle'],
      ]),
    [m],
  )
  const group = useLayerMaterials(Object.values(m), visible, boostFor(selected, owner))
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        {/* The skeleton model is 1.75 m vs the 1.80 m muscle model; stretch it vertically from the feet so the skull,
            eye sockets and jaw sit inside the head (leaves ~5 mm of scalp). */}
        <group scale={[1, SKELETON_Y_FIT, 1]}>
          <ModelMesh url={modelUrl('skeleton', detail)} materials={[m.bone]} />
        </group>
        <ModelMesh url={modelUrl('muscles', detail)} materials={[m.muscle]} />
      </Suspense>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Layer 3: Cardiovascular / fluids (hologram, fitted to the model)    */
/* ------------------------------------------------------------------ */

const HEART = v(0.03, 1.3, 0.03)

export function CardioLayer({ visible, statuses, selected }: LayerProps) {
  const m = useMaterials(() => ({
    heart: holo({ color: ANATOMY.heart, base: 0.3, rim: 1.2, power: 1.2 }),
    artery: holo({ color: ANATOMY.artery, base: 0.12, rim: 0.5, power: 1.5 }),
    vein: holo({ color: ANATOMY.vein, base: 0.07, rim: 0.4, power: 1.5 }),
    lymph: holo({ color: ANATOMY.lymph, base: 0.3, rim: 1, power: 1.2 }),
    spleen: holo({ color: ANATOMY.lymph, base: 0.12, rim: 0.9, power: 1.6 }),
  }))
  const heart = statuses.heart
  const immune = statuses.immune
  useEffect(() => {
    setTarget(m.heart, tint(heart, ANATOMY.heart))
    setTarget(m.artery, tint(heart, ANATOMY.artery))
    setTarget(m.lymph, tint(immune, ANATOMY.lymph))
    setTarget(m.spleen, tint(immune, ANATOMY.lymph))
  }, [m, heart, immune])
  const owner = useMemo(
    () =>
      new Map<THREE.Material, SystemId>([
        [m.heart, 'heart'],
        [m.artery, 'heart'],
        [m.vein, 'heart'],
        [m.lymph, 'immune'],
        [m.spleen, 'immune'],
      ]),
    [m],
  )
  const group = useLayerMaterials(Object.values(m), visible, boostFor(selected, owner))


  const vessels = useMemo(() => {
    const aorta = [HEART, v(0.02, 1.39, 0.0), v(-0.01, 1.42, -0.04), v(-0.012, 1.33, -0.07), v(0, 1.15, -0.065), v(0, 0.98, -0.04)]
    const arteries: THREE.Vector3[][] = [aorta]
    const veins: THREE.Vector3[][] = [[v(-0.02, 0.98, -0.03), v(-0.02, 1.15, -0.05), v(-0.02, 1.32, -0.04), v(0.01, 1.32, 0.02)]]
    for (const s of SIDES) {
      const b = J.of(s)
      const legA = [v(0, 0.98, -0.04), v(0.07 * s, 0.92, 0.0), v(0.1 * s, 0.75, 0.02), b.knee.clone().add(v(0, 0, -0.02)), v(0.13 * s, 0.3, -0.04), b.ankle.clone().add(v(0, 0, 0.02)), v(0.148 * s, 0.03, 0.1)]
      const armA = [v(0.02 * s, 1.41, -0.02), v(0.11 * s, 1.43, -0.02), b.shoulder, b.elbow.clone().add(v(0, 0, 0.015)), b.wrist.clone().add(v(0, 0, 0.012)), b.fingertip]
      const neckA = [v(0.02 * s, 1.41, -0.02), v(0.03 * s, 1.52, -0.005), v(0.04 * s, 1.63, 0.0), v(0.035 * s, 1.73, -0.03)]
      arteries.push(legA, armA, neckA)
      const off = v(0.016 * s, 0, 0.004)
      veins.push(legA.map((p) => p.clone().add(off)).reverse(), armA.map((p) => p.clone().add(v(0, -0.01, -0.01))).reverse(), neckA.map((p) => p.clone().add(v(0.012 * s, 0, -0.008))).reverse())
    }
    return { arteries, veins }
  }, [])

  return (
    <group ref={group}>
      <group position={HEART}>
        <Blob position={[0, 0, 0]} radii={[0.048, 0.06, 0.042]} rotation={[0.2, 0, -0.45]} materials={[m.heart]} />
        <Blob position={[-0.022, 0.03, -0.01]} radii={[0.03, 0.03, 0.03]} materials={[m.heart]} />
        <Blob position={[0.02, 0.032, -0.012]} radii={[0.026, 0.028, 0.026]} materials={[m.heart]} />
      </group>
      {vessels.arteries.map((pts, i) => (
        <Tube key={`a${i}`} points={pts} radius={i === 0 ? 0.011 : 0.0055} material={m.artery} segments={80} />
      ))}
      {vessels.veins.map((pts, i) => (
        <Tube key={`v${i}`} points={pts} radius={i === 0 ? 0.01 : 0.0045} material={m.vein} segments={80} />
      ))}
      {/* Immune: spleen + lymph nodes (neck, armpits, groin) */}
      <Blob position={v(0.1, 1.17, -0.05)} radii={[0.025, 0.04, 0.02]} materials={[m.spleen]} />
      {SIDES.flatMap((s) => [v(0.045 * s, 1.52, 0.02), v(0.15 * s, 1.36, -0.02), v(0.08 * s, 0.92, 0.06)]).map((p, i) => (
        <Blob key={i} position={p} radii={[0.009, 0.009, 0.009]} materials={[m.lymph]} geometry={LOW_SPHERE} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Layer 4: Organs & nervous system (hologram, fitted to the model)    */
/* ------------------------------------------------------------------ */

export function OrgansLayer({ visible, statuses, selected }: LayerProps) {
  const m = useMaterials(() => ({
    brain: holo({ color: ANATOMY.brain, base: 0.035, rim: 0.6, power: 1.8 }),
    eye: holo({ color: ANATOMY.organ, base: 0.35, rim: 1, power: 1.2 }),
    lung: holo({ color: ANATOMY.organ, base: 0.02, rim: 0.55, power: 2.0 }),
    gut: holo({ color: ANATOMY.organ, base: 0.03, rim: 0.55, power: 1.8 }),
    nerve: holo({ color: ANATOMY.nerve, base: 0.08, rim: 0.4, power: 1.5 }),
  }))
  const brainStatus = statuses.mind === 'warning' || statuses.sleep === 'warning' ? 'warning' : statuses.mind === 'caution' || statuses.sleep === 'caution' ? 'caution' : 'nominal'
  const { eyes, lungs, gut } = statuses
  useEffect(() => {
    setTarget(m.brain, tint(brainStatus, ANATOMY.brain))
    setTarget(m.eye, tint(eyes, ANATOMY.organ))
    setTarget(m.lung, tint(lungs, ANATOMY.organ))
    setTarget(m.gut, tint(gut, ANATOMY.organ))
  }, [m, brainStatus, eyes, lungs, gut])
  const brainOwner: SystemId = selected === 'sleep' ? 'sleep' : 'mind'
  const owner = useMemo(
    () =>
      new Map<THREE.Material, SystemId>([
        [m.brain, brainOwner],
        [m.eye, 'eyes'],
        [m.lung, 'lungs'],
        [m.gut, 'gut'],
      ]),
    [m, brainOwner],
  )
  const group = useLayerMaterials(Object.values(m), visible, boostFor(selected, owner))


  const nerves = useMemo(() => {
    const list: THREE.Vector3[][] = [[...SPINE, v(0, 1.63, -0.04)]]
    for (const s of SIDES) {
      const b = J.of(s)
      list.push([v(0, 1.42, -0.07), v(0.08 * s, 1.41, -0.04), b.shoulder.clone().add(v(0, -0.02, -0.01)), b.elbow.clone().add(v(0, 0, -0.012)), b.wrist.clone().add(v(0, 0, -0.008)), b.fingertip])
      list.push([v(0, 0.97, -0.08), v(0.06 * s, 0.9, -0.07), b.knee.clone().add(v(0, 0, -0.035)), b.ankle.clone().add(v(0, 0, -0.02)), b.toe])
      list.push([v(0, 1.25, -0.1), v(0.1 * s, 1.24, -0.06), v(0.14 * s, 1.22, 0.04)])
    }
    return list
  }, [])

  return (
    <group ref={group}>
      <Blob position={v(0, 1.71, -0.02)} radii={[0.074, 0.066, 0.09]} materials={[m.brain]} />
      <Blob position={v(0, 1.635, -0.075)} radii={[0.034, 0.024, 0.03]} materials={[m.brain]} />
      {SIDES.map((s) => (
        <Blob key={s} position={v(0.033 * s, 1.68, 0.068)} radii={[0.012, 0.012, 0.012]} materials={[m.eye]} />
      ))}
      <group position={[0, 1.33, -0.015]}>
        {SIDES.map((s) => (
          <Blob key={s} position={v(0.075 * s, 0, 0)} radii={[0.068, 0.12, 0.075]} rotation={[0, 0, 0.06 * s]} materials={[m.lung]} />
        ))}
      </group>
      <Blob position={v(-0.06, 1.16, 0.03)} radii={[0.095, 0.05, 0.065]} rotation={[0, 0, 0.25]} materials={[m.gut]} />
      <Blob position={v(0.065, 1.15, 0.04)} radii={[0.05, 0.06, 0.045]} rotation={[0, 0, -0.5]} materials={[m.gut]} />
      <mesh position={[0, 1.025, 0.03]} scale={[1.05, 0.8, 0.65]} material={m.gut} raycast={noRaycast}>
        <torusKnotGeometry args={[0.058, 0.013, 160, 10, 3, 7]} />
      </mesh>
      {SIDES.map((s) => (
        <Blob key={s} position={v(0.072 * s, 1.09, -0.07)} radii={[0.024, 0.045, 0.02]} rotation={[0, 0, -0.2 * s]} materials={[m.gut]} />
      ))}
      {nerves.map((pts, i) => (
        <Tube key={i} points={pts} radius={i === 0 ? 0.006 : 0.0025} material={m.nerve} segments={90} />
      ))}
    </group>
  )
}
