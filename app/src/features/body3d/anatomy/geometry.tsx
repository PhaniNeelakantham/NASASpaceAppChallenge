import { useMemo } from 'react'
import * as THREE from 'three'

export function tubeGeometry(points: THREE.Vector3[], radius: number, segments = 64, radial = 8): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, radial, false)
}

export const UNIT_SPHERE = new THREE.SphereGeometry(1, 40, 28)
export const LOW_SPHERE = new THREE.SphereGeometry(1, 20, 14)

interface BlobProps {
  position: THREE.Vector3 | [number, number, number]
  radii: [number, number, number]
  rotation?: [number, number, number]
  materials: THREE.Material[]
  geometry?: THREE.BufferGeometry
}

/** Ellipsoid (organs, joints, muscle groups). */
export function Blob({ position, radii, rotation, materials, geometry = UNIT_SPHERE }: BlobProps) {
  return (
    <>
      {materials.map((m, i) => (
        <mesh key={i} geometry={geometry} material={m} position={position} scale={radii} rotation={rotation} raycast={noRaycast} />
      ))}
    </>
  )
}

interface TubeProps {
  points: THREE.Vector3[]
  radius: number
  material: THREE.Material
  segments?: number
}

export function Tube({ points, radius, material, segments = 64 }: TubeProps) {
  const geometry = useMemo(() => tubeGeometry(points, radius, segments), [points, radius, segments])
  return <mesh geometry={geometry} material={material} raycast={noRaycast} />
}

/** Anatomy is decorative — only health nodes take pointer events (keeps hover cheap and unambiguous). */
export function noRaycast() {}
