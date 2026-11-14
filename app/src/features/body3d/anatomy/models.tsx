import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { noRaycast } from './geometry'

// CC0 models from grab3d.com, meshopt-compressed (decoder ships with three.js — works offline).
const BASE = import.meta.env.BASE_URL

/** Model detail setting: low = lighter meshes, no glow; medium = full meshes; high = full meshes + glow + sharper render. */
export type Detail = 'low' | 'medium' | 'high'

export function modelUrl(kind: 'muscles' | 'skeleton', detail: Detail): string {
  return `${BASE}models/${kind}${detail === 'low' ? '-low' : ''}.glb`
}

interface ModelPart {
  geometry: THREE.BufferGeometry
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
}

/** Pull the single mesh out of a GLB, keeping its node transform (meshopt quantization stores scale there). */
function useModelPart(url: string): ModelPart {
  const { scene } = useGLTF(url, false, true)
  return useMemo(() => {
    scene.updateMatrixWorld(true)
    let mesh: THREE.Mesh | undefined
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error(`No mesh in ${url}`)
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    mesh.matrixWorld.decompose(position, quaternion, scale)
    return { geometry: mesh.geometry, position, quaternion, scale }
  }, [scene, url])
}

/** Renders a downloaded anatomy model once per material (e.g. skin shell + inner glow). */
export function ModelMesh({ url, materials }: { url: string; materials: THREE.Material[] }) {
  const part = useModelPart(url)
  return (
    <>
      {materials.map((m, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={m}
          position={part.position}
          quaternion={part.quaternion}
          scale={part.scale}
          raycast={noRaycast}
        />
      ))}
    </>
  )
}

useGLTF.preload(modelUrl('muscles', 'medium'), false, true)
useGLTF.preload(modelUrl('skeleton', 'medium'), false, true)
