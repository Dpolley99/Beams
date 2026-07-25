import type { PointLoadInput, UDLInput } from '../types'

interface Props {
  length: number
  supportA: number
  supportB: number
  reactionA: number
  reactionB: number
  pointLoads: PointLoadInput[]
  udls: UDLInput[]
}

// Fixed pixel coordinate space (NOT tied to the beam's real length in
// the vertical direction) -- this keeps stroke widths/arrow sizes
// looking consistent regardless of how long the beam is, unlike
// letting the SVG viewBox stretch non-uniformly.
const WIDTH = 800
const HEIGHT = 170
const MARGIN = 30
const BEAM_Y = 80

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
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 font-semibold text-gray-800">Load Diagram</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
        {/* the beam itself */}
        <line x1={xScale(0)} y1={BEAM_Y} x2={xScale(length)} y2={BEAM_Y} stroke="black" strokeWidth={4} />

        {pointLoads.map((load, i) => (
          <PointLoadArrow key={i} x={xScale(load.position)} magnitude={load.magnitude} />
        ))}

        {udls.map((udl, i) => (
          <UDLArrows key={i} xStart={xScale(udl.start)} xEnd={xScale(udl.end)} intensity={udl.intensity} />
        ))}

        <Support x={xScale(supportA)} reaction={reactionA} type="pinned" />
        <Support x={xScale(supportB)} reaction={reactionB} type="roller" />
      </svg>
    </div>
  )
}

function PointLoadArrow({ x, magnitude }: { x: number; magnitude: number }) {
  const yStart = BEAM_Y - 45
  const yTip = BEAM_Y - 3
  return (
    <g>
      <line x1={x} y1={yStart} x2={x} y2={yTip - 8} stroke="#f97316" strokeWidth={2} />
      <polygon points={`${x - 4},${yTip - 8} ${x + 4},${yTip - 8} ${x},${yTip}`} fill="#f97316" />
      <text x={x} y={yStart - 6} textAnchor="middle" fontSize={12} fill="#f97316">
        {magnitude.toFixed(0)} N
      </text>
    </g>
  )
}

function UDLArrows({ xStart, xEnd, intensity }: { xStart: number; xEnd: number; intensity: number }) {
  const yTop = BEAM_Y - 28
  const yTip = BEAM_Y - 3
  const count = Math.max(2, Math.round((xEnd - xStart) / 30))
  const positions = Array.from({ length: count }, (_, i) => xStart + ((xEnd - xStart) * i) / (count - 1))

  return (
    <g>
      <line x1={xStart} y1={yTop} x2={xEnd} y2={yTop} stroke="#16a34a" strokeWidth={1.5} />
      {positions.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={yTop} x2={x} y2={yTip - 6} stroke="#16a34a" strokeWidth={1.5} />
          <polygon points={`${x - 3},${yTip - 6} ${x + 3},${yTip - 6} ${x},${yTip}`} fill="#16a34a" />
        </g>
      ))}
      <text x={(xStart + xEnd) / 2} y={yTop - 6} textAnchor="middle" fontSize={12} fill="#16a34a">
        {intensity.toFixed(0)} N/m
      </text>
    </g>
  )
}

function Support({ x, reaction, type }: { x: number; reaction: number; type: 'pinned' | 'roller' }) {
  const triWidth = 26
  const triHeight = 20

  return (
    <g>
      <polygon
        points={`${x},${BEAM_Y} ${x - triWidth / 2},${BEAM_Y + triHeight} ${x + triWidth / 2},${BEAM_Y + triHeight}`}
        fill="white"
        stroke="black"
        strokeWidth={1.5}
      />
      {type === 'pinned' ? (
        <>
          <line
            x1={x - triWidth * 0.7}
            y1={BEAM_Y + triHeight}
            x2={x + triWidth * 0.7}
            y2={BEAM_Y + triHeight}
            stroke="black"
            strokeWidth={1.5}
          />
          {Array.from({ length: 6 }, (_, i) => {
            const hx = x - triWidth * 0.6 + (i * triWidth * 1.2) / 5
            return (
              <line
                key={i}
                x1={hx}
                y1={BEAM_Y + triHeight}
                x2={hx - 6}
                y2={BEAM_Y + triHeight + 10}
                stroke="black"
                strokeWidth={1}
              />
            )
          })}
          <text x={x} y={BEAM_Y + triHeight + 26} textAnchor="middle" fontSize={12}>
            R = {reaction.toFixed(0)} N
          </text>
        </>
      ) : (
        <>
          <circle cx={x - triWidth * 0.22} cy={BEAM_Y + triHeight + 6} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <circle cx={x + triWidth * 0.22} cy={BEAM_Y + triHeight + 6} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <line
            x1={x - triWidth * 0.7}
            y1={BEAM_Y + triHeight + 11}
            x2={x + triWidth * 0.7}
            y2={BEAM_Y + triHeight + 11}
            stroke="black"
            strokeWidth={1.5}
          />
          <text x={x} y={BEAM_Y + triHeight + 30} textAnchor="middle" fontSize={12}>
            R = {reaction.toFixed(0)} N
          </text>
        </>
      )}
    </g>
  )
}
