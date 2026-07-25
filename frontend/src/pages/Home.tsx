import { useState } from 'react'
import type { BeamResult } from '../types'
import BeamForm from '../components/BeamForm'
import ShearForceChart from '../components/ShearForceChart'

export default function Home() {
  const [result, setResult] = useState<BeamResult | null>(null)

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Beam Calculator</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <BeamForm onResult={setResult} />

        <div className="space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-gray-200 p-4 text-sm">
                <h3 className="mb-2 font-semibold text-gray-800">Reactions</h3>
                <p>R_a = {result.reactions.a.toFixed(1)} N</p>
                <p>R_b = {result.reactions.b.toFixed(1)} N</p>
                <h3 className="mb-2 mt-4 font-semibold text-gray-800">Governing values</h3>
                <p>Max moment: {result.governing.max_moment.value.toFixed(1)} N·m (x={result.governing.max_moment.x.toFixed(2)} m)</p>
                <p>Max shear: {result.governing.max_shear.value.toFixed(1)} N (x={result.governing.max_shear.x.toFixed(2)} m)</p>
                <p>Max von Mises: {(result.governing.max_von_mises.value / 1e6).toFixed(2)} MPa (x={result.governing.max_von_mises.x.toFixed(2)} m)</p>
                <p>Max deflection: {(result.governing.max_deflection.value * 1000).toFixed(2)} mm (x={result.governing.max_deflection.x.toFixed(2)} m)</p>
              </div>

              <ShearForceChart result={result} />
              {/* Add BendingMomentChart, BendingStressChart, DeflectionChart,
                  VonMisesChart the same way -- same pattern as ShearForceChart,
                  just reading a different curve array. */}
            </>
          ) : (
            <p className="text-gray-500">Fill in the form and solve to see results.</p>
          )}
        </div>
      </div>
    </div>
  )
}
