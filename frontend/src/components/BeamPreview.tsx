import type { PointLoadInput, DistributedLoadInput } from '../types'
import { PointLoadArrow, DistributedLoadArrows, Support } from './BeamDiagramShapes'
import BeamProfile from './BeamProfile'
import { colorForIndex } from '../Loadcolors'
import { isValidSection } from '../crossSectionGeometry'

interface Props {
  length: number
  supportA: number
  supportB: number
  pointLoads: PointLoadInput[]
  distributedLoads: DistributedLoadInput[]
  sectionType: string
  sectionParams: Record<string, number>
  forceUnit: string
  intensityUnit: string
  lengthUnit: string
}

// Live beam sketch inside the form -- updates as the user builds up
// the load case. Draws the beam as an actual profile (BeamProfile,
// with hidden-line detail for hollow/flanged sections) rather than a
// thin centerline, plus every point/distributed load and both
// supports -- but NO reactions, since nothing's been solved yet.
// Uses the exact same drawing primitives and per-category proportional
// scaling as the results-page LoadDiagram, so the two stay visually
// consistent as loads are added/removed/edited.
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 220
const MARGIN = 30
const BEAM_CENTER_Y = 90
const THICKNESS = 26 // locked schematic thickness, NOT tied to the beam's real length scale
const DIM_LINE_Y = 185 // where the segment-length dimension row sits, below the supports
const MAX_POINT_LOAD_PX = 60
const MAX_DISTRIBUTED_PX = 30

// Every position worth marking with a dimension: the two ends, both
// supports, every point load, and every distributed load boundary --
// sorted and de-duplicated (a small epsilon avoids a near-duplicate
// float producing a zero-length segment when two inputs coincide).
function criticalPoints(
  length: number,
  supportA: number,
  supportB: number,
  pointLoads: PointLoadInput[],
  distributedLoads: DistributedLoadInput[]
): number[] {
  const raw = [
    0,
    length,
    supportA,
    supportB,
    ...pointLoads.map((p) => p.position),
    ...distributedLoads.flatMap((d) => [d.start, d.end]),
  ].filter((v) => Number.isFinite(v) && v >= 0 && v <= length)

  const sorted = [...new Set(raw)].sort((a, b) => a - b)
  const deduped: number[] = []
  for (const v of sorted) {
    if (deduped.length === 0 || v - deduped[deduped.length - 1] > 1e-6) deduped.push(v)
  }
  return deduped
}

export default function BeamPreview({
  length,
  supportA,
  supportB,
  pointLoads,
  distributedLoads,
  sectionType,
  sectionParams,
  forceUnit,
  intensityUnit,
  lengthUnit,
}: Props) {
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
  const beamTopY = BEAM_CENTER_Y - THICKNESS / 2
  const beamBottomY = BEAM_CENTER_Y + THICKNESS / 2
  const sectionOk = isValidSection(sectionType, sectionParams)

  const validPointLoads = pointLoads.filter((p) => Number.isFinite(p.position) && Number.isFinite(p.magnitude))
  const validDistributedLoads = distributedLoads.filter(
    (d) => Number.isFinite(d.start) && Number.isFinite(d.end) && d.end > d.start
  )

  // Same per-category independent scaling as LoadDiagram: point loads
  // proportional only to other point loads, distributed loads
  // proportional only to other distributed loads.
  const maxPointMagnitude = Math.max(0, ...validPointLoads.map((p) => Math.abs(p.magnitude)))
  const maxDistIntensity = Math.max(
    0,
    ...validDistributedLoads.flatMap((d) => [Math.abs(d.start_intensity), Math.abs(d.end_intensity)])
  )

  const points = criticalPoints(length, supportA, supportB, validPointLoads, validDistributedLoads)

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-gray-800">Beam Preview</h3>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full h-auto">
        {sectionOk ? (
          <BeamProfile
            x1={xScale(0)}
            x2={xScale(length)}
            centerY={BEAM_CENTER_Y}
            thickness={THICKNESS}
            sectionType={sectionType}
            sectionParams={sectionParams}
          />
        ) : (
          <line x1={xScale(0)} y1={BEAM_CENTER_Y} x2={xScale(length)} y2={BEAM_CENTER_Y} stroke="black" strokeWidth={4} />
        )}

        {validPointLoads.map((load, i) => {
          const heightPx = maxPointMagnitude > 0 ? (Math.abs(load.magnitude) / maxPointMagnitude) * MAX_POINT_LOAD_PX : 0
          return (
            <PointLoadArrow
              key={i}
              x={xScale(load.position)}
              magnitude={load.magnitude}
              beamTopY={beamTopY}
              heightPx={heightPx}
              color={colorForIndex(i)}
              unit={forceUnit}
            />
          )
        })}

        {validDistributedLoads.map((dl, i) => (
          <DistributedLoadArrows
            key={i}
            xStart={xScale(dl.start)}
            xEnd={xScale(dl.end)}
            startIntensity={dl.start_intensity}
            endIntensity={dl.end_intensity}
            maxIntensity={maxDistIntensity}
            beamTopY={beamTopY}
            color={colorForIndex(i)}
            unit={intensityUnit}
          />
        ))}

        <Support x={xScale(supportA)} type="pinned" beamBottomY={beamBottomY} />
        <Support x={xScale(supportB)} type="roller" beamBottomY={beamBottomY} />

        {/* Segment-length dimensions below the beam -- plain numbers;
            the lettered (A, B, C...) version is still queued for the
            results page. */}
        {points.map((p, i) => (
          <line key={`tick-${i}`} x1={xScale(p)} y1={DIM_LINE_Y - 5} x2={xScale(p)} y2={DIM_LINE_Y + 5} stroke="#6b7280" strokeWidth={1} />
        ))}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1]
          const mid = (xScale(p) + xScale(next)) / 2
          return (
            <text key={`seg-${i}`} x={mid} y={DIM_LINE_Y + 18} textAnchor="middle" fontSize={11} fill="#6b7280">
              {(next - p).toFixed(2)} {lengthUnit}
            </text>
          )
        })}
      </svg>
    </div>
  )
}