import { useState } from 'react'
import type { BeamRequest, BeamResult, Units } from '../types'
import BeamForm from '../components/BeamForm'
import LoadDiagram from '../components/LoadDiagram'
import ShearStressProfile from '../components/ShearStressProfile'
import CurveChart from '../components/CurveChart'

// Bending stress isn't a single formula for every section (T-section
// has separate top/bottom Z, since it's asymmetric) -- same logic as
// stress.bending_stress() in Python, ported here so the frontend can
// compute stress AT A KEY POINT (the backend only sends key points as
// M values, to keep that list generic across all five curves).
function bendingStressAt(M: number, section: Record<string, number>): number {
  if ('Z' in section) return M / section.Z
  const top = M / section.Z_top
  const bottom = M / section.Z_bottom
  return Math.abs(top) >= Math.abs(bottom) ? top : bottom
}

function argMaxAbs(values: number[]): number {
  return values.reduce((best, v, i) => (Math.abs(v) > Math.abs(values[best]) ? i : best), 0)
}

// ShearStressProfile draws the cross-section silhouette using a SINGLE
// shared scale between width and height, and the height half of that
// scale comes from result.section.y_min/y_max -- which the backend
// ALWAYS returns in SI meters (a deliberate design choice, see
// solver_service.py). But sectionParams straight off the request are
// in whatever unit was actually selected (e.g. mm) -- mixing a
// meters-based scale with mm-based width numbers pushes the shape
// thousands of pixels outside the canvas, which is exactly why it
// disappeared. This converts sectionParams to meters first, so both
// halves of the drawing are in the same unit again.
const SECTION_LENGTH_TO_M: Record<string, number> = { m: 1, mm: 0.001 }

function sectionParamsToSI(params: Record<string, number>, unit: string): Record<string, number> {
  const factor = SECTION_LENGTH_TO_M[unit] ?? 1
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v * factor]))
}

// Defensive fallback ONLY -- with the backend fix restored, result.units
// should always be present. Kept as a safety net so a malformed/older
// response can't crash rendering, not as a substitute for the backend
// actually sending units (that was the real bug -- see solver_service.py).
const FALLBACK_UNITS: Units = {
  length: 'm',
  section_length: 'm',
  force: 'N',
  intensity: 'N/m',
  moment: 'N.m',
  deflection: 'mm',
}

export default function Home() {
  const [request, setRequest] = useState<BeamRequest | null>(null)
  const [result, setResult] = useState<BeamResult | null>(null)

  function handleSolved(req: BeamRequest, res: BeamResult) {
    setRequest(req)
    setResult(res)
  }

  const sigmaMaxIdx = result ? argMaxAbs(result.curves.sigma) : 0
  // Read through this ONE variable everywhere below, not result.units
  // directly -- that inconsistency (some spots using the safe fallback,
  // others reaching into result.units raw) is exactly what was left
  // over from the original patch.
  const units = result?.units ?? FALLBACK_UNITS

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Beam Calculator</h1>

      <div className="mb-8">
        <BeamForm onSolved={handleSolved} />
      </div>

      {!result || !request ? (
        <p className="text-gray-500">Fill in the form and solve to see results.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-nowrap gap-6 overflow-x-auto pb-2">
            <LoadDiagram
              length={request.length}
              supportA={request.support_a}
              supportB={request.support_b}
              reactionA={result.reactions.a}
              reactionB={result.reactions.b}
              pointLoads={request.point_loads}
              distributedLoads={request.distributed_loads}
              forceUnit={units.force}
              intensityUnit={units.intensity}
            />
            <ShearStressProfile
              profile={result.shear_profile}
              sectionType={request.section_type}
              sectionParams={sectionParamsToSI(request.section_params, units.section_length)}
              section={result.section}
            />
          </div>

          {/* NOTE: the backend converts curves.x/V/M/deflection and
              every governing value to whichever units were requested
              (result.units) -- so nothing here is hardcoded to N/m/etc,
              it all reads from the 'units' variable above.
              sigma/von_mises stay Pa internally by design (stress is
              always shown as MPa, no unit choice), so THOSE keep their
              fixed 1e-6 scale. */}
          <CurveChart
            x={result.curves.x}
            y={result.curves.V}
            color="#2563eb"
            title="Shear Force Diagram (SFD)"
            yLabel={`V(x) [${units.force}]`}
            xLabel={`Position along beam (${units.length})`}
            valueSuffix={` ${units.force}`}
            keyPoints={result.key_points.flatMap((kp) =>
              kp.V_left === kp.V_right
                ? [{ x: kp.x, value: kp.V_left }]
                : [
                    { x: kp.x, value: kp.V_left },
                    { x: kp.x, value: kp.V_right },
                  ]
            )}
            governingPoint={{ x: result.governing.max_shear.x, value: result.governing.max_shear.value }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.M}
            color="#dc2626"
            title="Bending Moment Diagram (BMD)"
            yLabel={`M(x) [${units.moment}]`}
            xLabel={`Position along beam (${units.length})`}
            valueSuffix={` ${units.moment}`}
            keyPoints={result.key_points.map((kp) => ({ x: kp.x, value: kp.M }))}
            governingPoint={{ x: result.governing.max_moment.x, value: result.governing.max_moment.value }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.sigma}
            yScale={1e-6}
            color="#9333ea"
            title="Bending Stress Diagram"
            yLabel="sigma(x) [MPa]"
            xLabel={`Position along beam (${units.length})`}
            valueSuffix=" MPa"
            keyPoints={result.key_points.map((kp) => ({ x: kp.x, value: bendingStressAt(kp.M, result.section) }))}
            governingPoint={{ x: result.curves.x[sigmaMaxIdx], value: result.curves.sigma[sigmaMaxIdx] }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.von_mises}
            yScale={1e-6}
            color="#65a30d"
            title="von Mises Stress Diagram"
            yLabel="von Mises [MPa]"
            xLabel={`Position along beam (${units.length})`}
            valueSuffix=" MPa"
            governingPoint={{ x: result.governing.max_von_mises.x, value: result.governing.max_von_mises.value }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.deflection}
            color="#0891b2"
            title="Deflection Diagram"
            yLabel={`y(x) [${units.deflection}]`}
            xLabel={`Position along beam (${units.length})`}
            valueSuffix={` ${units.deflection}`}
            governingPoint={{ x: result.governing.max_deflection.x, value: result.governing.max_deflection.value }}
          />

          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <h3 className="mb-2 font-semibold text-gray-800">Summary</h3>
            <p>
              R_a = {result.reactions.a.toFixed(1)} {units.force}, R_b = {result.reactions.b.toFixed(1)} {units.force}
            </p>
            <p>
              Max shear: {result.governing.max_shear.value.toFixed(1)} {units.force} (x=
              {result.governing.max_shear.x.toFixed(2)} {units.length})
            </p>
            <p>
              Max moment: {result.governing.max_moment.value.toFixed(1)} {units.moment} (x=
              {result.governing.max_moment.x.toFixed(2)} {units.length})
            </p>
            <p>
              Max von Mises: {(result.governing.max_von_mises.value / 1e6).toFixed(2)} MPa (x=
              {result.governing.max_von_mises.x.toFixed(2)} {units.length})
            </p>
            <p>
              Max Shear Stress: {(result.governing.max_shear_stress.value / 1e6).toFixed(2)} MPa (at y=
              {(result.governing.max_shear_stress.y * 1000).toFixed(2)} mm from neutral axis -- section-internal, always SI)
            </p>
            <p>
              Max deflection: {result.governing.max_deflection.value.toFixed(2)} {units.deflection} (x=
              {result.governing.max_deflection.x.toFixed(2)} {units.length})
            </p>
          </div>
        </div>
      )}
    </div>
  )
}