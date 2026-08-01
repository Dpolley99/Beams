import { useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { BeamRequest, BeamResult, Units } from '../types'
import { solveBeam } from '../api'
import { SECTION_LABELS, SECTION_FIELDS, defaultParamsFor } from '../sectionTypes'
import CrossSectionPreview from './CrossSectionPreview'
import BeamPreview from './BeamPreview'

interface Props {
  onSolved: (request: BeamRequest, result: BeamResult) => void
}

interface PointLoadEntry {
  id: string
  magnitude: number
  position: number
}

interface DistributedLoadEntry {
  id: string
  start: number
  end: number
  startIntensity: number
  endIntensity: number
  isVarying: boolean // false = plain UDL (start/end intensity always kept equal), true = varying/trapezoidal
}

// Frontend default units match the EXISTING default numeric values
// (length defaults of 16/2/10 are meters, load defaults of 1000N/
// 100N-per-m are N and N/m, etc.) so introducing this feature doesn't
// silently reinterpret any default value -- deflection is the one
// exception, since it's output-only (no input field uses it), so
// defaulting it to 'mm' for nicer readability doesn't affect any
// typed-in number.
//
// NOTE: switching a unit dropdown does NOT convert whatever's already
// typed in the affected fields -- e.g. a section width of "0.1" typed
// while section_length='m' stays "0.1" if you switch to 'mm', which
// now means something 1000x smaller. This is a deliberate scope
// decision (live re-conversion of in-progress input is a much bigger
// feature), not a bug -- worth re-entering values after changing a unit.
const DEFAULT_UNITS: Units = {
  length: 'm',
  section_length: 'm',
  force: 'N',
  intensity: 'N/m',
  moment: 'N.m',
  deflection: 'mm',
}

// Loads start EMPTY -- the user builds up the load case by adding
// point loads and distributed loads one at a time, removing any of
// them freely. A distributed load's UDL/Varying toggle keeps
// start/end intensity forced equal while in UDL mode (see
// toggleVarying and updateUniformIntensity below), so there's no way
// for a "uniform" load to silently end up with mismatched ends.
export default function BeamForm({ onSolved }: Props) {
  const [length, setLength] = useState(16)
  const [supportA, setSupportA] = useState(2)
  const [supportB, setSupportB] = useState(10)

  const [pointLoads, setPointLoads] = useState<PointLoadEntry[]>([])
  const [distributedLoads, setDistributedLoads] = useState<DistributedLoadEntry[]>([])
  const nextId = useRef(0)
  const newId = () => `load-${nextId.current++}`

  const [sectionType, setSectionType] = useState('rectangle')
  const [sectionParams, setSectionParams] = useState<Record<string, number>>(defaultParamsFor('rectangle'))

  // E is ALWAYS GPa -- e.g. 200 for steel, not 200e9 (raw Pascals).
  const [youngsModulus, setYoungsModulus] = useState(200)

  const [units, setUnits] = useState<Units>(DEFAULT_UNITS)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateUnit<K extends keyof Units>(key: K, value: Units[K]) {
    setUnits((prev) => ({ ...prev, [key]: value }))
  }

  function handleSectionTypeChange(newType: string) {
    setSectionType(newType)
    setSectionParams(defaultParamsFor(newType))
  }

  function updateSectionParam(key: string, value: number) {
    setSectionParams((prev) => ({ ...prev, [key]: value }))
  }

  function addPointLoad() {
    setPointLoads((prev) => [...prev, { id: newId(), magnitude: 1000, position: length / 2 }])
  }

  function removePointLoad(id: string) {
    setPointLoads((prev) => prev.filter((p) => p.id !== id))
  }

  function updatePointLoad(id: string, patch: Partial<PointLoadEntry>) {
    setPointLoads((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addDistributedLoad() {
    setDistributedLoads((prev) => [
      ...prev,
      { id: newId(), start: 0, end: length, startIntensity: 100, endIntensity: 100, isVarying: false },
    ])
  }

  function removeDistributedLoad(id: string) {
    setDistributedLoads((prev) => prev.filter((d) => d.id !== id))
  }

  function updateDistributedLoad(id: string, patch: Partial<DistributedLoadEntry>) {
    setDistributedLoads((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  // While in UDL mode, the single "Intensity" field writes to BOTH
  // startIntensity and endIntensity, so they can never drift apart.
  function updateUniformIntensity(id: string, value: number) {
    setDistributedLoads((prev) => prev.map((d) => (d.id === id ? { ...d, startIntensity: value, endIntensity: value } : d)))
  }

  function toggleVarying(id: string) {
    setDistributedLoads((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        if (d.isVarying) {
          // switching back to uniform: collapse to the start value,
          // don't average or leave the old end value stale
          return { ...d, isVarying: false, endIntensity: d.startIntensity }
        }
        // switching to varying: both fields already match, just unlock the second one
        return { ...d, isVarying: true }
      })
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const request: BeamRequest = {
      length,
      support_a: supportA,
      support_b: supportB,
      point_loads: pointLoads.map((p) => ({ magnitude: p.magnitude, position: p.position })),
      distributed_loads: distributedLoads.map((d) => ({
        start: d.start,
        end: d.end,
        start_intensity: d.startIntensity,
        // safety net: force equality for UDL regardless of state
        // history, so a future UI bug can never send a "uniform" load
        // with mismatched ends
        end_intensity: d.isVarying ? d.endIntensity : d.startIntensity,
      })),
      section_type: sectionType,
      section_params: sectionParams,
      E: youngsModulus,
      units,
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
          <NumberField label={`Length (${units.length})`} value={length} onChange={setLength} />
          <NumberField label={`Support A position (${units.length}, fixed)`} value={supportA} onChange={setSupportA} />
          <NumberField label={`Support B position (${units.length}, roller)`} value={supportB} onChange={setSupportB} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-800">Point loads</legend>
          {pointLoads.map((pl, idx) => (
            <div key={pl.id} className="space-y-2 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Load {idx + 1}</span>
                <button type="button" onClick={() => removePointLoad(pl.id)} className="text-xs text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
              <NumberField
                label={`Magnitude (${units.force})`}
                value={pl.magnitude}
                onChange={(v) => updatePointLoad(pl.id, { magnitude: v })}
              />
              <NumberField
                label={`Position (${units.length})`}
                value={pl.position}
                onChange={(v) => updatePointLoad(pl.id, { position: v })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addPointLoad}
            className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
          >
            + Add point load
          </button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-800">Distributed loads</legend>
          {distributedLoads.map((dl, idx) => (
            <div key={dl.id} className="space-y-2 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Load {idx + 1}</span>
                <button type="button" onClick={() => removeDistributedLoad(dl.id)} className="text-xs text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
              <NumberField label={`Start (${units.length})`} value={dl.start} onChange={(v) => updateDistributedLoad(dl.id, { start: v })} />
              <NumberField label={`End (${units.length})`} value={dl.end} onChange={(v) => updateDistributedLoad(dl.id, { end: v })} />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={dl.isVarying} onChange={() => toggleVarying(dl.id)} />
                Varying (start/end intensity differ)
              </label>
              {dl.isVarying ? (
                <>
                  <NumberField
                    label={`Start intensity (${units.intensity})`}
                    value={dl.startIntensity}
                    onChange={(v) => updateDistributedLoad(dl.id, { startIntensity: v })}
                  />
                  <NumberField
                    label={`End intensity (${units.intensity})`}
                    value={dl.endIntensity}
                    onChange={(v) => updateDistributedLoad(dl.id, { endIntensity: v })}
                  />
                </>
              ) : (
                <NumberField
                  label={`Intensity (${units.intensity})`}
                  value={dl.startIntensity}
                  onChange={(v) => updateUniformIntensity(dl.id, v)}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addDistributedLoad}
            className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
          >
            + Add distributed load
          </button>
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
              label={`${field.label} (${units.section_length})`}
              value={sectionParams[field.key] ?? field.default}
              onChange={(v) => updateSectionParam(field.key, v)}
              step={0.001}
            />
          ))}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold text-gray-800">Material</legend>
          <NumberField label="Young's modulus E (GPa)" value={youngsModulus} onChange={setYoungsModulus} />
        </fieldset>

        <fieldset className="space-y-3 xl:col-span-2">
          <legend className="font-semibold text-gray-800">Units</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SelectField label="Length" value={units.length} onChange={(v) => updateUnit('length', v as Units['length'])} options={['m', 'mm']} />
            <SelectField
              label="Section dimensions"
              value={units.section_length}
              onChange={(v) => updateUnit('section_length', v as Units['section_length'])}
              options={['m', 'mm']}
            />
            <SelectField label="Force" value={units.force} onChange={(v) => updateUnit('force', v as Units['force'])} options={['N', 'kN']} />
            <SelectField
              label="Distributed load intensity"
              value={units.intensity}
              onChange={(v) => updateUnit('intensity', v as Units['intensity'])}
              options={['N/m', 'kN/m', 'N/mm', 'kN/mm']}
            />
            <SelectField
              label="Moment (results)"
              value={units.moment}
              onChange={(v) => updateUnit('moment', v as Units['moment'])}
              options={['N.m', 'kN.m', 'N.mm', 'kN.mm']}
            />
            <SelectField
              label="Deflection (results)"
              value={units.deflection}
              onChange={(v) => updateUnit('deflection', v as Units['deflection'])}
              options={['m', 'mm']}
            />
          </div>
          <p className="text-xs text-gray-400">Stress (bending, shear, von Mises) is always shown in MPa.</p>
        </fieldset>
      </div>

      <div className="mt-6 flex flex-nowrap gap-4 overflow-x-auto pb-2">
        <div className="min-w-/[420px]/ flex-1">
          <BeamPreview
            length={length}
            supportA={supportA}
            supportB={supportB}
            pointLoads={pointLoads.map((p) => ({ magnitude: p.magnitude, position: p.position }))}
            distributedLoads={distributedLoads.map((d) => ({
              start: d.start,
              end: d.end,
              start_intensity: d.startIntensity,
              end_intensity: d.isVarying ? d.endIntensity : d.startIntensity,
            }))}
            sectionType={sectionType}
            sectionParams={sectionParams}
            forceUnit={units.force}
            intensityUnit={units.intensity}
            lengthUnit={units.length}
          />
        </div>
        <div className="shrink-0">
          <CrossSectionPreview sectionType={sectionType} sectionParams={sectionParams} />
        </div>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="block text-xs">
      <span className="text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}