import { computeExtents, overallWidth, isValidSection } from '../crossSectionGeometry'
import CrossSectionShape from './CrossSectionShape'

interface Props {
  sectionType: string
  sectionParams: Record<string, number>
}

// Live preview inside the form -- updates instantly as the user
// types dimensions, using client-side geometry (crossSectionGeometry.ts)
// rather than calling the backend on every keystroke. Uses the same
// CrossSectionShape drawing component as the results-page silhouette,
// so the two will always look identical for the same inputs.
const WIDTH = 160
const HEIGHT = 160
const MARGIN = 16

export default function CrossSectionPreview({ sectionType, sectionParams }: Props) {
  if (!isValidSection(sectionType, sectionParams)) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-md border border-dashed border-gray-300 text-center text-xs text-gray-400">
        Enter valid dimensions to preview
      </div>
    )
  }

  const { y_min, y_max, ybar } = computeExtents(sectionType, sectionParams)
  const yRange = y_max - y_min || 1
  const realWidth = overallWidth(sectionType, sectionParams) || 1

  const plotWidth = WIDTH - 2 * MARGIN
  const plotHeightAvail = HEIGHT - 2 * MARGIN

  // "Contain" fit: pick whichever scale (width-limited or
  // height-limited) is smaller, and use that SAME value for both
  // directions -- this guarantees the shape never gets clipped, and
  // preserves its true width:height proportions (no independent
  // stretching), at the cost of not necessarily filling the whole box.
  const scale = Math.min(plotWidth / realWidth, plotHeightAvail / yRange)
  const shapeHeightPx = yRange * scale

  // center the shape vertically within the available area (its real
  // height may be less than the box allows, once "contain" is applied)
  const topPad = MARGIN + (plotHeightAvail - shapeHeightPx) / 2
  const yToPixel = (yv: number) => topPad + (y_max - yv) * scale
  const centerX = WIDTH / 2
  const pixelX = (xv: number) => centerX + xv * scale

  return (
    <div className="rounded-md border border-gray-200 p-2">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1={0} y1={yToPixel(0)} x2={WIDTH} y2={yToPixel(0)} stroke="#000" strokeWidth={0.5} strokeDasharray="3 3" />
        <CrossSectionShape
          sectionType={sectionType}
          params={sectionParams}
          ybar={ybar}
          yMinForShape={y_min}
          pixelX={pixelX}
          yToPixel={yToPixel}
          scaleX={scale}
          scaleY={scale}
        />
      </svg>
      <p className="mt-1 text-center text-[10px] text-gray-400">preview (proportions preserved, not to real-world scale)</p>
    </div>
  )
}