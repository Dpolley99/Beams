import type { ShearProfile } from '../types'

interface Props {
  profile: ShearProfile
}

// "Stress vs height through the cross-section" -- different in kind
// from every other panel (which are "vs position along the beam").
// Custom SVG (like LoadDiagram) rather than recharts, since this
// needs a flipped/rotated axis convention (height vertical, stress
// horizontal) that's simpler to get right by computing pixel
// positions directly than by fighting a charting library's axis
// orientation assumptions.
const WIDTH = 300
const HEIGHT = 260
const MARGIN = 50

export default function ShearStressProfile({ profile }: Props) {
  const { y, tau, x_governing } = profile
  const tauMpa = tau.map((t) => t / 1e6)

  const yMin = Math.min(...y)
  const yMax = Math.max(...y)
  const tauMin = Math.min(0, ...tauMpa)
  const tauMax = Math.max(0, ...tauMpa)
  const tauRange = tauMax - tauMin || 1

  const plotWidth = WIDTH - 2 * MARGIN
  const plotHeight = HEIGHT - 2 * MARGIN

  // y is flipped: larger physical height -> smaller pixel Y (higher up on screen)
  const yToPixel = (yv: number) => MARGIN + ((yMax - yv) / (yMax - yMin || 1)) * plotHeight
  const tauToPixel = (t: number) => MARGIN + ((t - tauMin) / tauRange) * plotWidth

  const points = y.map((yv, i) => `${tauToPixel(tauMpa[i])},${yToPixel(yv)}`).join(' ')
  const zeroLineX = tauToPixel(0)
  const neutralAxisY = yToPixel(0)

  const maxIdx = tauMpa.reduce((best, val, i) => (Math.abs(val) > Math.abs(tauMpa[best]) ? i : best), 0)
  const maxTauMpa = tauMpa[maxIdx]
  const maxY = y[maxIdx]

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-1 font-semibold text-gray-800">Shear Stress Profile</h3>
      <p className="mb-2 text-xs text-gray-500">at governing section x = {x_governing.toFixed(2)} m</p>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {/* axes */}
        <line x1={zeroLineX} y1={MARGIN} x2={zeroLineX} y2={HEIGHT - MARGIN} stroke="#000" strokeWidth={1} />
        <line
          x1={MARGIN}
          y1={neutralAxisY}
          x2={WIDTH - MARGIN}
          y2={neutralAxisY}
          stroke="#000"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />

        {/* filled profile area, matching the Python version's fill_betweenx */}
        <polygon points={`${zeroLineX},${yToPixel(yMin)} ${points} ${zeroLineX},${yToPixel(yMax)}`} fill="#92400e" fillOpacity={0.15} />
        <polyline points={points} fill="none" stroke="#92400e" strokeWidth={2} />

        {/* peak marker */}
        <circle cx={tauToPixel(maxTauMpa)} cy={yToPixel(maxY)} r={4} fill="#92400e" />
        <text x={tauToPixel(maxTauMpa)} y={yToPixel(maxY) - 10} textAnchor="middle" fontSize={10} fill="#92400e">
          {maxTauMpa.toFixed(3)} MPa
        </text>

        {/* axis labels */}
        <text x={WIDTH / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#374151">
          Shear stress [MPa]
        </text>
        <text
          x={12}
          y={HEIGHT / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#374151"
          transform={`rotate(-90, 12, ${HEIGHT / 2})`}
        >
          Height [m]
        </text>
      </svg>
    </div>
  )
}
