import { useState } from 'react'
import type { FormEvent } from 'react'
import type { BeamRequest, BeamResult } from '../types'
import { solveBeam } from '../api'
import { SECTION_LABELS, SECTION_FIELDS, defaultParamsFor } from '../sectionTypes'
import CrossSectionPreview from './CrossSectionPreview'

interface Props {
  onSolved: (request: BeamRequest, result: BeamResult) => void
}

// Starter scope: ONE point load + ONE UDL. Section type is fully
// selectable (see sectionTypes.ts). Multiple loads (add/remove) is
// the next natural extension, following the same
// backend-already-supports-it pattern.
//
// Layout: fieldsets sit in a responsive grid (side by side on wide
// screens, wrapping on narrow ones) so the whole form reads as one
// horizontal "setup bar" across the top, rather than a tall stacked
// sidebar.
export default function BeamForm({ onSolved }: Props) {
  const [length, setLength] = useState(16)
  const [supportA, setSupportA] = useState(2)
  const [supportB, setSupportB] = useState(10)
  const [loadMagnitude, setLoadMagnitude] = useState(3000)
  const [loadPosition, setLoadPosition] = useState(7)
  const [udlIntensity, setUdlIntensity] = useState(150)
  const [udlStart, setUdlStart] = useState(5)
  const [udlEnd, setUdlEnd] = useState(11)

  const [sectionType, setSectionType] = useState('rectangle')
  const [sectionParams, setSectionParams] = useState<Record<string, number>>(defaultParamsFor('rectangle'))

  const [youngsModulus, setYoungsModulus] = useState(200e9)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSectionTypeChange(newType: string) {
    setSectionType(newType)
    setSectionParams(defaultParamsFor(newType))
  }

  function updateSectionParam(key: string, value: number) {
    setSectionParams((prev) => ({ ...prev, [key]: value }))
  }

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
      section_type: sectionType,
      section_params: sectionParams,
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
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <legend className="font-semibold text-gray-800">Cross-section</legend>
          <label className="block text-sm">
            <span className="text-gray-600">Section type</span>
            <select
              value={sectionType}
              onChange={(e) => handleSectionTypeChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {SECTION_FIELDS[sectionType].map((field) => (
            <NumberField
              key={field.key}
              label={field.label}
              value={sectionParams[field.key] ?? field.default}
              onChange={(v) => updateSectionParam(field.key, v)}
              step={0.001}
            />
          ))}

          <CrossSectionPreview sectionType={sectionType} sectionParams={sectionParams} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-800">Material</legend>
          <NumberField label="Young's modulus E (Pa)" value={youngsModulus} onChange={setYoungsModulus} />
        </fieldset>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-8"
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
