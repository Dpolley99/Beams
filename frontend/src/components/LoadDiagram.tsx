import type { PointLoadInput, DistributedLoadInput } from '../types'
import { PointLoadArrow, DistributedLoadArrows, Support } from './BeamDiagramShapes'
import { colorForIndex } from '../Loadcolors'

interface Props {
  length: number
  supportA: number
  supportB: number
  reactionA: number
  reactionB: number
  pointLoads: PointLoadInput[]
  distributedLoads: DistributedLoadInput[]
}

// Fixed pixel coordinate space, matching CurveChart's own fixed
// 600x260 size -- so the load diagram reads as "one more chart in the
// row" instead of a differently-proportioned block.
const WIDTH = 600
const HEIGHT = 260
const MARGIN = 30
const BEAM_Y = 110
const MAX_POINT_LOAD_PX = 60
const MAX_DISTRIBUTED_PX = 30

export default function LoadDiagram({
  length,
  supportA,
  supportB,
  reactionA,
  reactionB,
  pointLoads,
  distributedLoads,
}: Props) {
  const usableWidth = WIDTH - 2 * MARGIN
  const xScale = (pos: number) => MARGIN + (pos / length) * usableWidth

  // Each category scales independently: point loads are proportional
  // ONLY to other point loads, distributed loads ONLY to other
  // distributed loads -- a 600N and 650N point load look close in
  // height to each other, regardless of what any distributed load's
  // intensity happens to be.
  const maxPointMagnitude = Math.max(0, ...pointLoads.map((p) => Math.abs(p.magnitude)))
  const maxDistIntensity = Math.max(
    0,
    ...distributedLoads.flatMap((d) => [Math.abs(d.start_intensity), Math.abs(d.end_intensity)])
  )

  return (
    <div className="rounded-lg border border-gray-200 p-4 shrink-0">
      <h3 className="mb-2 font-semibold text-gray-800">Load Diagram</h3>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1={xScale(0)} y1={BEAM_Y} x2={xScale(length)} y2={BEAM_Y} stroke="black" strokeWidth={4} />

        {pointLoads.map((load, i) => {
          const heightPx = maxPointMagnitude > 0 ? (Math.abs(load.magnitude) / maxPointMagnitude) * MAX_POINT_LOAD_PX : 0
          return (
            <PointLoadArrow
              key={i}
              x={xScale(load.position)}
              magnitude={load.magnitude}
              beamTopY={BEAM_Y}
              heightPx={heightPx}
              color={colorForIndex(i)}
            />
          )
        })}

        {distributedLoads.map((dl, i) => (
          <DistributedLoadArrows
            key={i}
            xStart={xScale(dl.start)}
            xEnd={xScale(dl.end)}
            startIntensity={dl.start_intensity}
            endIntensity={dl.end_intensity}
            maxIntensity={maxDistIntensity}
            beamTopY={BEAM_Y}
            color={colorForIndex(i)}
          />
        ))}

        <Support x={xScale(supportA)} reaction={reactionA} type="pinned" beamBottomY={BEAM_Y} />
        <Support x={xScale(supportB)} reaction={reactionB} type="roller" beamBottomY={BEAM_Y} />
      </svg>
    </div>
  )
}