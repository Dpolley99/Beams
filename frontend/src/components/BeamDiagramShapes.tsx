// Shared drawing primitives for anything that draws "a beam with
// loads and supports on it" -- used by both LoadDiagram.tsx (the
// solved results page, which knows the reactions) and
// BeamPreview.tsx (the live form preview, which doesn't -- nothing's
// been solved yet). beamY is passed in so each caller can use its own
// vertical layout; reaction is optional so Support() can be drawn
// with or without a known reaction value.

export function PointLoadArrow({ x, magnitude, beamY }: { x: number; magnitude: number; beamY: number }) {
  const yStart = beamY - 45
  const yTip = beamY - 3
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

export function UDLArrows({ xStart, xEnd, intensity, beamY }: { xStart: number; xEnd: number; intensity: number; beamY: number }) {
  const yTop = beamY - 28
  const yTip = beamY - 3
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

interface SupportProps {
  x: number
  beamY: number
  type: 'pinned' | 'roller'
  reaction?: number // omit while nothing's been solved yet (the live preview)
}

export function Support({ x, beamY, type, reaction }: SupportProps) {
  const triWidth = 26
  const triHeight = 20

  return (
    <g>
      <polygon
        points={`${x},${beamY} ${x - triWidth / 2},${beamY + triHeight} ${x + triWidth / 2},${beamY + triHeight}`}
        fill="white"
        stroke="black"
        strokeWidth={1.5}
      />
      {type === 'pinned' ? (
        <>
          <line
            x1={x - triWidth * 0.7}
            y1={beamY + triHeight}
            x2={x + triWidth * 0.7}
            y2={beamY + triHeight}
            stroke="black"
            strokeWidth={1.5}
          />
          {Array.from({ length: 6 }, (_, i) => {
            const hx = x - triWidth * 0.6 + (i * triWidth * 1.2) / 5
            return (
              <line key={i} x1={hx} y1={beamY + triHeight} x2={hx - 6} y2={beamY + triHeight + 10} stroke="black" strokeWidth={1} />
            )
          })}
          <text x={x} y={beamY + triHeight + 26} textAnchor="middle" fontSize={12}>
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} N` : 'Fixed'}
          </text>
        </>
      ) : (
        <>
          <circle cx={x - triWidth * 0.22} cy={beamY + triHeight + 6} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <circle cx={x + triWidth * 0.22} cy={beamY + triHeight + 6} r={5} fill="white" stroke="black" strokeWidth={1.5} />
          <line
            x1={x - triWidth * 0.7}
            y1={beamY + triHeight + 11}
            x2={x + triWidth * 0.7}
            y2={beamY + triHeight + 11}
            stroke="black"
            strokeWidth={1.5}
          />
          <text x={x} y={beamY + triHeight + 30} textAnchor="middle" fontSize={12}>
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} N` : 'Roller'}
          </text>
        </>
      )}
    </g>
  )
}