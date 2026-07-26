import type { PointLoadInput, UDLInput } from '../types'
import { PointLoadArrow, UDLArrows, Support } from './BeamDiagramShapes'
import BeamProfile from './BeamProfile'
import { isValidSection } from '../crossSectionGeometry'

interface Props {
  length: number
  supportA: number
  supportB: number
  pointLoads: PointLoadInput[]
  udls: UDLInput[]
  sectionType: string
  sectionParams: Record<string, number>
}

// Live beam sketch inside the form -- updates as the user types. Draws
// the beam as an actual profile (BeamProfile, with hidden-line detail
// for hollow/flanged sections) rather than a thin centerline, plus the
// applied loads, supports, and segment-length dimensions below the
// beam -- but NO reactions, since nothing's been solved yet.
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 220
const MARGIN = 30
const BEAM_CENTER_Y = 90
const THICKNESS = 26 // locked schematic thickness, NOT tied to the beam's real length scale
const DIM_LINE_Y = 185 // where the segment-length dimension row sits, below the supports

// Every position worth marking with a dimension: the two ends, both
// supports, the point load, and both UDL boundaries -- sorted and
// de-duplicated (a small epsilon avoids near-duplicate floats
// producing a zero-length segment when two inputs happen to coincide).
function criticalPoints(length: number, supportA: number, supportB: number, pointLoads: PointLoadInput[], udls: UDLInput[]): number[] {
  const raw = [
    0,
    length,
    supportA,
    supportB,
    ...pointLoads.map((p) => p.position),
    ...udls.flatMap((u) => [u.start, u.end]),
  ].filter((v) => Number.isFinite(v) && v >= 0 && v <= length)

  const sorted = [...new Set(raw)].sort((a, b) => a - b)
  const deduped: number[] = []
  for (const v of sorted) {
    if (deduped.length === 0 || v - deduped[deduped.length - 1] > 1e-6) deduped.push(v)
  }
  return deduped
}

export default function BeamPreview({ length, supportA, supportB, pointLoads, udls, sectionType, sectionParams }: Props) {
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

  const points = criticalPoints(length, supportA, supportB, pointLoads, udls)

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

        {pointLoads
          .filter((load) => Number.isFinite(load.position) && Number.isFinite(load.magnitude))
          .map((load, i) => (
            <PointLoadArrow key={i} x={xScale(load.position)} magnitude={load.magnitude} beamTopY={beamTopY} />
          ))}

        {udls
          .filter((udl) => Number.isFinite(udl.start) && Number.isFinite(udl.end) && udl.end > udl.start)
          .map((udl, i) => (
            <UDLArrows key={i} xStart={xScale(udl.start)} xEnd={xScale(udl.end)} intensity={udl.intensity} beamTopY={beamTopY} />
          ))}

        <Support x={xScale(supportA)} type="pinned" beamBottomY={beamBottomY} />
        <Support x={xScale(supportB)} type="roller" beamBottomY={beamBottomY} />

        {/* Segment-length dimensions below the beam -- a tick at every
            critical point, with the distance to the next one labeled
            in between. Plain numbers for now; the lettered (A, B, C...)
            version is still queued for the results page. */}
        {points.map((p, i) => (
          <line key={`tick-${i}`} x1={xScale(p)} y1={DIM_LINE_Y - 5} x2={xScale(p)} y2={DIM_LINE_Y + 5} stroke="#6b7280" strokeWidth={1} />
        ))}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1]
          const mid = (xScale(p) + xScale(next)) / 2
          return (
            <text key={`seg-${i}`} x={mid} y={DIM_LINE_Y + 18} textAnchor="middle" fontSize={11} fill="#6b7280">
              {(next - p).toFixed(2)} m
            </text>
          )
        })}
      </svg>
    </div>
  )
}