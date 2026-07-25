import { useState, FormEvent } from 'react'
import type { BeamRequest, BeamResult } from '../types'
import { solveBeam } from '../api'

interface Props {
  onSolved: (request: BeamRequest, result: BeamResult) => void
}

// Starter scope: ONE point load + ONE UDL + a rectangular section --
// mirrors the original console version's flow. The backend already
// accepts arrays of loads and every section type from cross_sections.py,
// so extending this form to add/remove multiple loads, or a dropdown
// for section type (with fields that change based on the selection),
// is the natural next step -- this just proves the wiring end-to-end.
export default function BeamForm({ onSolved }: Props) {
  const [length, setLength] = useState(16)
  const [supportA, setSupportA] = useState(2)
  const [supportB, setSupportB] = useState(10)
  const [loadMagnitude, setLoadMagnitude] = useState(3000)
  const [loadPosition, setLoadPosition] = useState(7)
  const [udlIntensity, setUdlIntensity] = useState(150)
  const [udlStart, setUdlStart] = useState(5)
  const [udlEnd, setUdlEnd] = useState(11)
  const [sectionB, setSectionB] = useState(0.1)
  const [sectionH, setSectionH] = useState(0.1)
  const [youngsModulus, setYoungsModulus] = useState(200e9)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const request: BeamRequest = {
      length,
      support_a: supportA,
      support_b: supportB,
      point_loads: [{ magnitude: loadMagnitude, position: loadPosition }],
      udls: [{ intensity: udlIntensity, start: udlStart, end: udlEnd }],
      section_type: 'rectangle',
      section_params: { b: sectionB, h: sectionH },
      E: youngsModulus,
    }

    try {
      const result = await solveBeam(request)
      onSolved(request, result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 p-6">
      <fieldset className="space-y-3">
        <legend className="font-semibold text-gray-800">Beam setup</legend>
        <NumberField label="Length (m)" value={length} onChange={setLength} />
        <NumberField label="Support A position (m, fixed)" value={supportA} onChange={setSupportA} />
        <NumberField label="Support B position (m, roller)" value={supportB} onChange={setSupportB} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-gray-800">Point load</legend>
        <NumberField label="Magnitude (N)" value={loadMagnitude} onChange={setLoadMagnitude} />
        <NumberField label="Position (m)" value={loadPosition} onChange={setLoadPosition} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-gray-800">UDL</legend>
        <NumberField label="Intensity (N/m)" value={udlIntensity} onChange={setUdlIntensity} />
        <NumberField label="Start (m)" value={udlStart} onChange={setUdlStart} />
        <NumberField label="End (m)" value={udlEnd} onChange={setUdlEnd} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-gray-800">Section (rectangle)</legend>
        <NumberField label="Width b (m)" value={sectionB} onChange={setSectionB} step={0.01} />
        <NumberField label="Height h (m)" value={sectionH} onChange={setSectionH} step={0.01} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-gray-800">Material</legend>
        <NumberField label="Young's modulus E (Pa)" value={youngsModulus} onChange={setYoungsModulus} />
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Solving...' : 'Solve beam'}
      </button>
    </form>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
      />
    </label>
  )
}
