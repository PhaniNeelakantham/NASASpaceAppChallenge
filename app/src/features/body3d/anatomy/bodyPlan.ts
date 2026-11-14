import * as THREE from 'three'

// Body plan in meters, measured from the downloaded CC0 muscle model (public/models/muscles.glb):
// 1.80 m tall, feet at y = 0, facing +z (toward the default camera), A-pose.
// Astronaut's LEFT side is +x (appears on the viewer's right).
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export type Side = 1 | -1
export const SIDES: Side[] = [1, -1]

function side(s: Side) {
  return {
    shoulder: v(0.19 * s, 1.43, -0.025),
    elbow: v(0.31 * s, 1.13, -0.045),
    wrist: v(0.41 * s, 0.97, -0.025),
    fingertip: v(0.47 * s, 0.77, 0.0),
    hip: v(0.09 * s, 0.93, -0.01),
    knee: v(0.12 * s, 0.5, -0.03),
    ankle: v(0.14 * s, 0.1, -0.05),
    toe: v(0.15 * s, 0.02, 0.13),
  }
}

export const J = {
  head: v(0, 1.675, -0.015),
  L: side(1),
  R: side(-1),
  of: (s: Side) => (s === 1 ? J.L : J.R),
}

/** Spine centerline (inside the back), pelvis to skull base. */
export const SPINE: THREE.Vector3[] = [
  v(0, 0.95, -0.08),
  v(0, 1.05, -0.095),
  v(0, 1.15, -0.09),
  v(0, 1.25, -0.1),
  v(0, 1.35, -0.09),
  v(0, 1.45, -0.07),
  v(0, 1.56, -0.05),
]
