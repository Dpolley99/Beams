// These types mirror the backend's request/response shapes EXACTLY
// (see backend/api.py and backend/solver_service.py). If you add a
// field on one side, add it here too, or TypeScript won't catch the
// mismatch.

export interface PointLoadInput {
  magnitude: number
  position: number
}

export interface DistributedLoadInput {
  start: number
  end: number
  start_intensity: number
  end_intensity: number
}

export interface BeamRequest {
  length: number
  support_a: number
  support_b: number
  point_loads: PointLoadInput[]
  distributed_loads: DistributedLoadInput[]
  section_type: string
  section_params: Record<string, number>
  E: number
}

export interface Curves {
  x: number[]
  V: number[]
  M: number[]
  sigma: number[]
  deflection: number[]
  von_mises: number[]
}

export interface KeyPoint {
  x: number
  V_left: number
  V_right: number
  M: number
  labels: string[]
}

export interface GoverningPoint {
  x: number
  value: number
}

export interface Governing {
  max_moment: GoverningPoint
  max_shear: GoverningPoint
  max_shear_stress: { value: number; y: number }
  max_von_mises: GoverningPoint
  max_deflection: GoverningPoint
}

export interface ShearProfile {
  y: number[]
  tau: number[]
  x_governing: number
}

export interface BeamResult {
  reactions: { a: number; b: number }
  curves: Curves
  key_points: KeyPoint[]
  governing: Governing
  shear_profile: ShearProfile
  section: Record<string, number>
}