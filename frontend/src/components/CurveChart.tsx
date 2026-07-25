import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

interface Marker {
  x: number
  value: number
}

interface CurveChartProps {
  x: number[]
  y: number[]
  color: string
  title: string
  yLabel: string
  yScale?: number // multiply y by this before plotting, e.g. 1e-6 for Pa->MPa
  valueSuffix?: string
  keyPoints?: Marker[]
  governingPoint?: Marker
}

// ONE generic chart used for SFD, BMD, bending stress, deflection, and
// von Mises -- same pattern each time, just different curve data. This
// mirrors how diagrams.py had one shared drawing pattern reused across
// panels instead of separate near-duplicate code per diagram.
//
// Key points are shown via a small dot (hover for the exact value,
// via the Tooltip) rather than the Python version's always-visible
// text labels -- this leans into the hover-to-inspect behavior you
// wanted eventually anyway, instead of cluttering the chart with text.
export default function CurveChart({
  x,
  y,
  color,
  title,
  yLabel,
  yScale = 1,
  valueSuffix = '',
  keyPoints = [],
  governingPoint,
}: CurveChartProps) {
  const data = x.map((xi, i) => ({ x: xi, y: y[i] * yScale }))

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-gray-800">{title}</h3>
      <LineChart width={600} height={260} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          label={{ value: 'Position along beam (m)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(2)}${valueSuffix}`}
          labelFormatter={(xv) => `x = ${Number(xv).toFixed(2)} m`}
        />
        <ReferenceLine y={0} stroke="#000" />
        {keyPoints.map((kp, i) => (
          <ReferenceDot key={i} x={kp.x} y={kp.value * yScale} r={4} fill={color} stroke="none" isFront />
        ))}
        {governingPoint && (
          <ReferenceDot
            x={governingPoint.x}
            y={governingPoint.value * yScale}
            r={7}
            fill="#dc2626"
            stroke="#fff"
            strokeWidth={1}
            isFront
          />
        )}
        <Line type="monotone" dataKey="y" stroke={color} dot={false} strokeWidth={2} />
      </LineChart>
    </div>
  )
}
