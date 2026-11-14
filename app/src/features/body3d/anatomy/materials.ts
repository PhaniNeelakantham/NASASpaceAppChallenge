import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../theme'

const vertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  uniform float uInflate;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    wp.xyz += normalize(mat3(modelMatrix) * normal) * uInflate; // world-space inflate
    vec4 mv = viewMatrix * wp;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

// Static fresnel "x-ray" shell: transparent core, brighter silhouette edges. No animation.
const holoFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uRim;
  uniform float uPower;
  uniform float uFade;
  uniform float uBoost;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    float a = uBase + f * uRim;
    vec3 c = uColor * (0.45 + 1.3 * f) * uBoost;
    gl_FragColor = vec4(c, a * uFade);
  }
`

export interface HoloOpts {
  color: string
  base?: number
  rim?: number
  power?: number
  boost?: number
  /** Push vertices out along their normals (meters) — turns the muscle mesh into a skin shell. */
  inflate?: number
}

export function holo(o: HoloOpts): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(o.color) },
      uBase: { value: o.base ?? 0.03 },
      uRim: { value: o.rim ?? 0.9 },
      uPower: { value: o.power ?? 2.2 },
      uFade: { value: 1 },
      uBoost: { value: o.boost ?? 1 },
      uInflate: { value: o.inflate ?? 0 },
    },
    vertexShader: vertex,
    fragmentShader: holoFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  m.userData.target = new THREE.Color(o.color)
  return m
}

/** Set the color a material will smoothly transition to. */
export function setTarget(m: THREE.Material, hex: string) {
  ;(m.userData.target as THREE.Color).set(hex)
}

/**
 * Drives a layer's fade-in/out (layer peeling), status color changes and selection highlight.
 * These transitions carry meaning, so they stay. Returns a ref for the layer group.
 */
export function useLayerMaterials(
  mats: THREE.Material[],
  visible: boolean,
  boost: (m: THREE.Material) => number = () => 1,
) {
  const group = useRef<THREE.Group>(null)
  const fade = useRef(visible ? 1 : 0)
  useFrame((_, dt) => {
    fade.current = damp(fade.current, visible ? 1 : 0, 5, dt)
    const f = fade.current
    if (group.current) group.current.visible = f > 0.01
    for (const m of mats) {
      if (!(m instanceof THREE.ShaderMaterial)) continue
      m.uniforms.uFade.value = f
      ;(m.uniforms.uColor.value as THREE.Color).lerp(m.userData.target as THREE.Color, 1 - Math.exp(-4 * dt))
      m.uniforms.uBoost.value = damp(m.uniforms.uBoost.value, boost(m), 6, dt)
    }
  })
  return group
}

export function useMaterials<T extends Record<string, THREE.Material>>(factory: () => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [])
}
