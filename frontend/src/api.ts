import type { BeamRequest, BeamResult } from './types'

const API_BASE = 'http://localhost:8000'

export async function solveBeam(request: BeamRequest): Promise<BeamResult> {
  const response = await fetch(`${API_BASE}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.detail ?? `Request failed: ${response.status}`)
  }

  return response.json()
}
