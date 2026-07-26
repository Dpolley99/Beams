// Shared drawing primitives for anything that draws "a beam with
// loads and supports on it" -- used by LoadDiagram.tsx (solved
// results, thin centerline, knows reactions), BeamPreview.tsx (live
// form preview, thick real profile, no reactions yet), and
// BeamElevation.tsx (results, thick profile, no forces).
//
// Arrows anchor to beamTopY (the beam's top surface) and supports
// anchor to beamBottomY (the bottom surface) -- for a thin-line
// diagram these are simply the same value; for a beam drawn with real
// thickness (BeamProfile), they're genuinely different, which is why
// they're separate parameters rather than one shared "beamY".

export function PointLoadArrow({ x, magnitude, beamTopY }: { x: number; magnitude: number; beamTopY: number }) {
  const yStart = beamTopY - 45
  const yTip = beamTopY - 3
  return (
    <g>
      <line x1={x} y1={yStart} x2={x} y2={yTip - 8} stroke="#f97316" strokeWidth={2.5} />
      <polygon points={`${x - 5},${yTip - 8} ${x + 5},${yTip - 8} ${x},${yTip}`} fill="#f97316" />
      <text x={x} y={yStart - 6} textAnchor="middle" fontSize={12} fill="#f97316">
        {magnitude.toFixed(0)} N
      </text>
    </g>
  )
}

export function UDLArrows({
  xStart,
  xEnd,
  intensity,
  beamTopY,
}: {
  xStart: number
  xEnd: number
  intensity: number
  beamTopY: number
}) {
  const yTop = beamTopY - 28
  const yTip = beamTopY - 3
  const count = Math.max(2, Math.round((xEnd - xStart) / 30))
  const positions = Array.from({ length: count }, (_, i) => xStart + ((xEnd - xStart) * i) / (count - 1))

  return (
    <g>
      <line x1={xStart} y1={yTop} x2={xEnd} y2={yTop} stroke="#16a34a" strokeWidth={2} />
      {positions.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={yTop} x2={x} y2={yTip - 6} stroke="#16a34a" strokeWidth={2} />
          <polygon points={`${x - 4},${yTip - 6} ${x + 4},${yTip - 6} ${x},${yTip}`} fill="#16a34a" />
        </g>
      ))}
      <text x={(xStart + xEnd) / 2} y={yTop - 6} textAnchor="middle" fontSize={12} fill="#16a34a">
        {intensity.toFixed(0)} N/m
      </text>
    </g>
  )
}

interface SupportProps {
  x: number
  beamBottomY: number
  type: 'pinned' | 'roller'
  reaction?: number // omit while nothing's been solved yet (the live preview)
}

export function Support({ x, beamBottomY, type, reaction }: SupportProps) {
  const triWidth = 26
  const triHeight = 20

  return (
    <g>
      <polygon
        points={`${x},${beamBottomY} ${x - triWidth / 2},${beamBottomY + triHeight} ${x + triWidth / 2},${beamBottomY + triHeight}`}
        fill="white"
        stroke="black"
        strokeWidth={1.5}
      />
      {type === 'pinned' ? (
        <>
          <line
            x1={x - triWidth * 0.7}
            y1={beamBottomY + triHeight}
            x2={x + triWidth * 0.7}
            y2={beamBottomY + triHeight}
            stroke="black"
            strokeWidth={1.5}
          />
          {Array.from({ length: 6 }, (_, i) => {
            const hx = x - triWidth * 0.6 + (i * triWidth * 1.2) / 5
            return (
              <line
                key={i}
                x1={hx}
                y1={beamBottomY + triHeight}
                x2={hx - 6}
                y2={beamBottomY + triHeight + 10}
                stroke="black"
                strokeWidth={1}
              />
            )
          })}
          <text x={x} y={beamBottomY + triHeight + 26} textAnchor="middle" fontSize={12}>
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} N` : 'Fixed'}
          </text>
        </>
      ) : (
        <>
          <circle cx={x - 8} cy={beamBottomY + triHeight + 9} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <circle cx={x + 8} cy={beamBottomY + triHeight + 9} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <line
            x1={x - triWidth * 0.7}
            y1={beamBottomY + triHeight + 17}
            x2={x + triWidth * 0.7}
            y2={beamBottomY + triHeight + 17}
            stroke="black"
            strokeWidth={1.5}
          />
          <text x={x} y={beamBottomY + triHeight + 33} textAnchor="middle" fontSize={12}>
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} N` : 'Roller'}
          </text>
        </>
      )}
    </g>
  )
}