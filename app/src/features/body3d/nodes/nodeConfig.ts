import type { SystemId } from '../../../types'
import type { LayerId } from '../theme'

export type ZoneId = 'full' | 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'

export interface NodeCfg {
  id: SystemId
  /** Short network-style label. */
  tag: string
  pos: [number, number, number]
  layer: LayerId
}

// Anchors sit on the anatomy each system refers to. +x = astronaut's left.
export const NODES: NodeCfg[] = [
  { id: 'skin', tag: 'SKIN', pos: [0.235, 1.42, 0.07], layer: 'skin' },
  { id: 'muscle', tag: 'MUSCLE', pos: [-0.11, 0.74, 0.1], layer: 'musculo' },
  { id: 'bones', tag: 'BONE', pos: [0.125, 0.6, 0.04], layer: 'musculo' },
  { id: 'heart', tag: 'CARDIO', pos: [0.035, 1.3, 0.1], layer: 'cardio' },
  { id: 'immune', tag: 'IMMUNE', pos: [-0.05, 1.52, 0.05], layer: 'cardio' },
  { id: 'lungs', tag: 'LUNGS', pos: [-0.09, 1.37, 0.11], layer: 'organs' },
  { id: 'gut', tag: 'METABOLIC', pos: [0.0, 1.06, 0.12], layer: 'organs' },
  { id: 'eyes', tag: 'VISION', pos: [0.033, 1.68, 0.1], layer: 'organs' },
  { id: 'mind', tag: 'MIND', pos: [0.0, 1.81, 0.0], layer: 'organs' },
  { id: 'sleep', tag: 'SLEEP', pos: [-0.1, 1.73, 0.0], layer: 'organs' },
]

export interface ZoneCfg {
  id: ZoneId
  label: string
  target: [number, number, number]
  position: [number, number, number]
}

export const ZONES: ZoneCfg[] = [
  { id: 'full', label: 'Full body', target: [0, 0.86, 0], position: [0, 1.05, 3.6] },
  { id: 'head', label: 'Head', target: [0, 1.68, 0], position: [0.15, 1.74, 0.8] },
  { id: 'torso', label: 'Torso', target: [0, 1.2, 0], position: [0.2, 1.3, 1.45] },
  { id: 'leftArm', label: 'Left arm', target: [0.34, 1.1, 0], position: [1.05, 1.2, 1.0] },
  { id: 'rightArm', label: 'Right arm', target: [-0.34, 1.1, 0], position: [-1.05, 1.2, 1.0] },
  { id: 'leftLeg', label: 'Left leg', target: [0.12, 0.5, 0], position: [0.7, 0.65, 1.35] },
  { id: 'rightLeg', label: 'Right leg', target: [-0.12, 0.5, 0], position: [-0.7, 0.65, 1.35] },
]
