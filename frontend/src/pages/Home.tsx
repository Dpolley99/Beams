import { useState } from 'react'
import type { BeamRequest, BeamResult } from '../types'
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

export default function Home() {
  const [request, setRequest] = useState<BeamRequest | null>(null)
  const [result, setResult] = useState<BeamResult | null>(null)

  function handleSolved(req: BeamRequest, res: BeamResult) {
    setRequest(req)
    setResult(res)
  }

  const sigmaMaxIdx = result ? argMaxAbs(result.curves.sigma) : 0

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
          {/* Top row: load diagram + shear stress profile, side by
              side. flex-nowrap + overflow-x-auto guarantees these
              never wrap onto separate lines -- if the viewport is too
              narrow to fit both, this row scrolls horizontally on its
              own instead of breaking the layout. */}
          <div className="flex flex-nowrap gap-6 overflow-x-auto pb-2">
            <LoadDiagram
              length={request.length}
              supportA={request.support_a}
              supportB={request.support_b}
              reactionA={result.reactions.a}
              reactionB={result.reactions.b}
              pointLoads={request.point_loads}
              udls={request.udls}
            />
            <ShearStressProfile
              profile={result.shear_profile}
              sectionType={request.section_type}
              sectionParams={request.section_params}
              section={result.section}
            />
          </div>

          <CurveChart
            x={result.curves.x}
            y={result.curves.V}
            color="#2563eb"
            title="Shear Force Diagram (SFD)"
            yLabel="V(x) [N]"
            valueSuffix=" N"
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
            yLabel="M(x) [N.m]"
            valueSuffix=" N.m"
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
            valueSuffix=" MPa"
            keyPoints={result.key_points.map((kp) => ({ x: kp.x, value: bendingStressAt(kp.M, result.section) }))}
            governingPoint={{ x: result.curves.x[sigmaMaxIdx], value: result.curves.sigma[sigmaMaxIdx] }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.deflection}
            yScale={1000}
            color="#0891b2"
            title="Deflection Diagram"
            yLabel="y(x) [mm]"
            valueSuffix=" mm"
            governingPoint={{ x: result.governing.max_deflection.x, value: result.governing.max_deflection.value }}
          />

          <CurveChart
            x={result.curves.x}
            y={result.curves.von_mises}
            yScale={1e-6}
            color="#65a30d"
            title="von Mises Stress Diagram"
            yLabel="von Mises [MPa]"
            valueSuffix=" MPa"
            governingPoint={{ x: result.governing.max_von_mises.x, value: result.governing.max_von_mises.value }}
          />

          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <h3 className="mb-2 font-semibold text-gray-800">Summary</h3>
            <p>R_a = {result.reactions.a.toFixed(1)} N, R_b = {result.reactions.b.toFixed(1)} N</p>
            <p>Max moment: {result.governing.max_moment.value.toFixed(1)} N.m (x={result.governing.max_moment.x.toFixed(2)} m)</p>
            <p>Max shear: {result.governing.max_shear.value.toFixed(1)} N (x={result.governing.max_shear.x.toFixed(2)} m)</p>
            <p>Max von Mises: {(result.governing.max_von_mises.value / 1e6).toFixed(2)} MPa (x={result.governing.max_von_mises.x.toFixed(2)} m)</p>
            <p>Max deflection: {(result.governing.max_deflection.value * 1000).toFixed(2)} mm (x={result.governing.max_deflection.x.toFixed(2)} m)</p>
          </div>
        </div>
      )}
    </div>
  )
}