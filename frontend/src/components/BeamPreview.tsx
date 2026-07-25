import type { PointLoadInput, UDLInput } from '../types'
import { PointLoadArrow, UDLArrows, Support } from './BeamDiagramShapes'

interface Props {
  length: number
  supportA: number
  supportB: number
  pointLoads: PointLoadInput[]
  udls: UDLInput[]
}

// Live beam sketch inside the form -- updates as the user types, the
// same idea as CrossSectionPreview but for the beam's overall layout.
// No reactions shown (nothing's been solved yet); reuses the exact
// same drawing primitives as the results-page LoadDiagram, so the
// two will always look consistent.
//
// Unlike LoadDiagram (a fixed 600x260, matched pixel-for-pixel to
// CurveChart so it sits correctly beside other fixed-size panels),
// this one is alone on its own full-width row with nothing to align
// against -- so it can scale responsively to fill the form's width.
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 160
const MARGIN = 30
const BEAM_Y = 80

export default function BeamPreview({ length, supportA, supportB, pointLoads, udls }: Props) {
  const valid =
    Number.isFinite(length) &&
    length > 0 &&
    Number.isFinite(supportA) &&
    Number.isFinite(supportB) &&
    supportA >= 0 &&
    supportA <= length &&
    supportB >= 0 &&
    supportB <= length

  if (!valid) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
        Enter a valid beam length and support positions to preview
      </div>
    )
  }

  const usableWidth = VIEW_WIDTH - 2 * MARGIN
  const xScale = (pos: number) => MARGIN + (Math.min(Math.max(pos, 0), length) / length) * usableWidth

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-gray-800">Beam Preview</h3>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full h-auto">
        <line x1={xScale(0)} y1={BEAM_Y} x2={xScale(length)} y2={BEAM_Y} stroke="black" strokeWidth={4} />

        {pointLoads
          .filter((load) => Number.isFinite(load.position) && Number.isFinite(load.magnitude))
          .map((load, i) => (
            <PointLoadArrow key={i} x={xScale(load.position)} magnitude={load.magnitude} beamY={BEAM_Y} />
          ))}

        {udls
          .filter((udl) => Number.isFinite(udl.start) && Number.isFinite(udl.end) && udl.end > udl.start)
          .map((udl, i) => (
            <UDLArrows key={i} xStart={xScale(udl.start)} xEnd={xScale(udl.end)} intensity={udl.intensity} beamY={BEAM_Y} />
          ))}

        <Support x={xScale(supportA)} type="pinned" beamY={BEAM_Y} />
        <Support x={xScale(supportB)} type="roller" beamY={BEAM_Y} />
      </svg>
    </div>
  )
}