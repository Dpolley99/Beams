import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { BeamResult } from '../types'

interface Props {
  result: BeamResult
}

// Proves the end-to-end wiring: backend curve data -> recharts.
// This also delivers the "hover to see the value" idea from earlier --
// recharts' Tooltip does this automatically, no extra work needed.
// The same pattern (zip x[] with another curve array, render a
// <LineChart>) works for BMD, bending stress, deflection, and von
// Mises -- copy this component and swap which curve array it reads.
export default function ShearForceChart({ result }: Props) {
  const data = result.curves.x.map((x, i) => ({
    x,
    V: result.curves.V[i],
  }))

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-gray-800">Shear Force Diagram</h3>
      <LineChart width={600} height={300} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" label={{ value: 'Position along beam (m)', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'V(x) [N]', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value: number) => value.toFixed(1)} labelFormatter={(x) => `x = ${Number(x).toFixed(2)} m`} />
        <ReferenceLine y={0} stroke="#000" />
        <Line type="monotone" dataKey="V" stroke="#2563eb" dot={false} strokeWidth={2} />
      </LineChart>
    </div>
  )
}
