import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export interface Focus {
  target: [number, number, number]
  /** Explicit camera position; if omitted we keep the current viewing direction. */
  position?: [number, number, number]
  distance?: number
  nonce: number
}

// Constant objects so React never re-applies them (which would reset the target every render).
const START_TARGET: [number, number, number] = [0, 0.86, 0]
// Left-drag (and one-finger swipe) orbits; right-drag and middle-drag pan (move the view); wheel / pinch zooms.
const MOUSE_BUTTONS = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }
const TOUCHES = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }

export function CameraRig({ focus, shiftX = 0 }: { focus: Focus | null; shiftX?: number }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const flight = useRef<{ target: THREE.Vector3; pos: THREE.Vector3 } | null>(null)
  const shift = useRef(0)
  const size = useThree((s) => s.size)

  useEffect(() => {
    const c = controls.current
    if (!focus || !c) return
    const target = new THREE.Vector3(...focus.target)
    let pos: THREE.Vector3
    if (focus.position) pos = new THREE.Vector3(...focus.position)
    else {
      const dir = camera.position.clone().sub(c.target).normalize()
      pos = target.clone().add(dir.multiplyScalar(focus.distance ?? 1))
    }
    flight.current = { target, pos }
  }, [focus, camera])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const f = flight.current
    if (f) {
      // Critically-damped glide toward the zone — no overshoot, no jitter.
      const k = 1 - Math.exp(-3.2 * dt)
      c.target.lerp(f.target, k)
      camera.position.lerp(f.pos, k)
      if (c.target.distanceTo(f.target) < 0.002 && camera.position.distanceTo(f.pos) < 0.004) flight.current = null
    }
    // Slide the rendered view sideways (e.g. to make room for the detail panel) without moving the camera.
    const next = shift.current + (shiftX - shift.current) * (1 - Math.exp(-6 * dt))
    if (Math.abs(next - shift.current) > 0.05 || (shiftX === 0 && shift.current !== 0 && Math.abs(next) < 0.5)) {
      shift.current = Math.abs(next) < 0.5 && shiftX === 0 ? 0 : next
      const cam = camera as THREE.PerspectiveCamera
      if (shift.current === 0) cam.clearViewOffset()
      else cam.setViewOffset(size.width, size.height, shift.current, 0, size.width, size.height)
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={START_TARGET}
      mouseButtons={MOUSE_BUTTONS}
      touches={TOUCHES}
      enableDamping
      dampingFactor={0.045}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      panSpeed={0.6}
      screenSpacePanning
      minDistance={0.45}
      maxDistance={4.5}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI - 0.3}
      onStart={() => {
        flight.current = null
      }}
    />
  )
}
