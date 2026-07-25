import type { ShearProfile } from '../types'
import CrossSectionShape from './CrossSectionShape'

interface Props {
  profile: ShearProfile
  sectionType: string
  sectionParams: Record<string, number>
  section: Record<string, number> // the backend's computed section props (y_min, y_max, ybar, ...)
}

// Section silhouette (left) + shear stress profile (right), sharing
// ONE vertical scale -- this is what guarantees the two line up: the
// same real-world height range (section.y_min to section.y_max) maps
// to the same pixel range in both drawings, since they're computed
// from the same yToPixel() function inside one component.
const CHART_WIDTH = 200
const SECTION_WIDTH = 220
const HEIGHT = 260
const MARGIN_TOP = 40
const MARGIN_BOTTOM = 40
const CHART_MARGIN_SIDE = 32

export default function ShearStressProfile({ profile, sectionType, sectionParams, section }: Props) {
  const { y, tau, x_governing } = profile
  const tauMpa = tau.map((t) => t / 1e6)

  const yMin = section.y_min
  const yMax = section.y_max
  const yRange = yMax - yMin || 1

  const tauMin = Math.min(0, ...tauMpa)
  const tauMax = Math.max(0, ...tauMpa)
  const tauRange = tauMax - tauMin || 1

  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM
  const yToPixel = (yv: number) => MARGIN_TOP + ((yMax - yv) / yRange) * plotHeight

  const chartPlotWidth = CHART_WIDTH - 2 * CHART_MARGIN_SIDE
  const tauToPixel = (t: number) => CHART_MARGIN_SIDE + ((t - tauMin) / tauRange) * chartPlotWidth
  const points = y.map((yv, i) => `${tauToPixel(tauMpa[i])},${yToPixel(yv)}`).join(' ')
  const zeroLineX = tauToPixel(0)
  const maxIdx = tauMpa.reduce((best, val, i) => (Math.abs(val) > Math.abs(tauMpa[best]) ? i : best), 0)

  // scaleY MUST stay tied to plotHeight/yRange -- that's what keeps
  // the section silhouette vertically aligned with the stress chart
  // beside it. To preserve the section's TRUE proportions (not
  // distort width vs height independently), scaleX uses that exact
  // same value rather than being fit to the box width separately --
  // e.g. a circular section will render as an actual circle, not an
  // ellipse stretched to fill its column.
  const scaleY = plotHeight / yRange
  const scaleX = scaleY
  const centerX = SECTION_WIDTH / 2
  const pixelX = (xv: number) => centerX + xv * scaleX

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex-shrink-0">
      <h3 className="mb-1 font-semibold text-gray-800">Cross-Section &amp; Shear Stress Profile</h3>
      <p className="mb-2 text-xs text-gray-500">at governing section x = {x_governing.toFixed(2)} m</p>
      {sectionType === 'channel' && (
        <p className="mb-2 text-xs text-gray-400">
          (modeled as a symmetric I-section for bending -- the open side doesn't affect vertical bending behavior)
        </p>
      )}

      <div className="flex items-start">
        <svg width={SECTION_WIDTH} height={HEIGHT} viewBox={`0 0 ${SECTION_WIDTH} ${HEIGHT}`}>
          <line
            x1={0}
            y1={yToPixel(0)}
            x2={SECTION_WIDTH}
            y2={yToPixel(0)}
            stroke="#000"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <CrossSectionShape
            sectionType={sectionType}
            params={sectionParams}
            ybar={section.ybar ?? 0}
            yMinForShape={yMin}
            pixelX={pixelX}
            yToPixel={yToPixel}
            scaleX={scaleX}
            scaleY={scaleY}
          />
        </svg>

        <svg width={CHART_WIDTH} height={HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${HEIGHT}`}>
          <line x1={zeroLineX} y1={MARGIN_TOP} x2={zeroLineX} y2={HEIGHT - MARGIN_BOTTOM} stroke="#000" strokeWidth={1} />
          <line
            x1={CHART_MARGIN_SIDE}
            y1={yToPixel(0)}
            x2={CHART_WIDTH - CHART_MARGIN_SIDE}
            y2={yToPixel(0)}
            stroke="#000"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />

          <polygon
            points={`${zeroLineX},${yToPixel(yMin)} ${points} ${zeroLineX},${yToPixel(yMax)}`}
            fill="#92400e"
            fillOpacity={0.15}
          />
          <polyline points={points} fill="none" stroke="#92400e" strokeWidth={2} />

          <circle cx={tauToPixel(tauMpa[maxIdx])} cy={yToPixel(y[maxIdx])} r={4} fill="#92400e" />
          <text x={tauToPixel(tauMpa[maxIdx])} y={yToPixel(y[maxIdx]) - 10} textAnchor="middle" fontSize={10} fill="#92400e">
            {tauMpa[maxIdx].toFixed(3)} MPa
          </text>

          <text x={CHART_WIDTH / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#374151">
            Shear stress [MPa]
          </text>
        </svg>
      </div>
    </div>
  )
}