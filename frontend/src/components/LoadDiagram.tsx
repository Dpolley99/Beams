import type { PointLoadInput, UDLInput } from '../types'
import { PointLoadArrow, UDLArrows, Support } from './BeamDiagramShapes'

interface Props {
  length: number
  supportA: number
  supportB: number
  reactionA: number
  reactionB: number
  pointLoads: PointLoadInput[]
  udls: UDLInput[]
}

// Fixed pixel coordinate space, matching CurveChart's own fixed
// 600x260 size -- so the load diagram reads as "one more chart in the
// row" instead of a differently-proportioned block.
const WIDTH = 600
const HEIGHT = 260
const MARGIN = 30
const BEAM_Y = 110

export default function LoadDiagram({
  length,
  supportA,
  supportB,
  reactionA,
  reactionB,
  pointLoads,
  udls,
}: Props) {
  const usableWidth = WIDTH - 2 * MARGIN
  const xScale = (pos: number) => MARGIN + (pos / length) * usableWidth

  return (
    <div className="rounded-lg border border-gray-200 p-4 shrink-0">
      <h3 className="mb-2 font-semibold text-gray-800">Load Diagram</h3>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1={xScale(0)} y1={BEAM_Y} x2={xScale(length)} y2={BEAM_Y} stroke="black" strokeWidth={4} />

        {pointLoads.map((load, i) => (
          <PointLoadArrow key={i} x={xScale(load.position)} magnitude={load.magnitude} beamTopY={BEAM_Y} />
        ))}

        {udls.map((udl, i) => (
          <UDLArrows key={i} xStart={xScale(udl.start)} xEnd={xScale(udl.end)} intensity={udl.intensity} beamTopY={BEAM_Y} />
        ))}

        <Support x={xScale(supportA)} reaction={reactionA} type="pinned" beamBottomY={BEAM_Y} />
        <Support x={xScale(supportB)} reaction={reactionB} type="roller" beamBottomY={BEAM_Y} />
      </svg>
    </div>
  )
}