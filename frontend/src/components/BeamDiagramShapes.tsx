// Shared drawing primitives for anything that draws "a beam with
// loads and supports on it" -- used by LoadDiagram.tsx (solved
// results, thin centerline, knows reactions) and BeamElevation.tsx
// (just the physical shape, no forces).
//
// Arrows anchor to beamTopY (the beam's top surface) and supports
// anchor to beamBottomY (the bottom surface) -- for a thin-line
// diagram these are simply the same value.
//
// Each load gets its own color and its own pixel height, computed by
// the CALLER (LoadDiagram) from that load's value relative to the
// max within its OWN category (point loads scale 0-60px among
// themselves, distributed loads scale 0-30px among themselves,
// independently of each other) -- see LoadDiagram.tsx for that
// scaling logic. This file only draws whatever height it's given.

export function PointLoadArrow({
  x,
  magnitude,
  beamTopY,
  heightPx,
  color,
  unit = 'N',
}: {
  x: number
  magnitude: number
  beamTopY: number
  heightPx: number
  color: string
  unit?: string
}) {
  const yTip = beamTopY - 3
  const headLen = Math.min(8, heightPx)
  const yStart = yTip - heightPx
  const yShaftEnd = yTip - headLen

  return (
    <g>
      {heightPx > 0 && <line x1={x} y1={yStart} x2={x} y2={yShaftEnd} stroke={color} strokeWidth={2.5} />}
      <polygon points={`${x - 5},${yShaftEnd} ${x + 5},${yShaftEnd} ${x},${yTip}`} fill={color} />
      <text x={x} y={yStart - 6} textAnchor="middle" fontSize={12} fill={color}>
        {magnitude.toFixed(0)} {unit}
      </text>
    </g>
  )
}

interface DistributedLoadArrowsProps {
  xStart: number
  xEnd: number
  startIntensity: number
  endIntensity: number
  maxIntensity: number // the largest |intensity| among ALL distributed loads, for proportional scaling
  beamTopY: number
  color: string
  unit?: string
}

// Draws one arrow per sample point along the span, each with its OWN
// height based on the LOCAL (linearly interpolated) intensity at that
// position -- this is what makes a varying load's arrows visibly
// taper. A plain UDL is just the case where start/end intensity are
// equal, so every arrow ends up the same height automatically.
export function DistributedLoadArrows({
  xStart,
  xEnd,
  startIntensity,
  endIntensity,
  maxIntensity,
  beamTopY,
  color,
  unit = 'N/m',
}: DistributedLoadArrowsProps) {
  const yTip = beamTopY - 3
  const isVarying = startIntensity !== endIntensity
  const count = Math.max(2, Math.round((xEnd - xStart) / 30))

  const heightAt = (frac: number) => {
    const localIntensity = startIntensity + (endIntensity - startIntensity) * frac
    return maxIntensity > 0 ? (Math.abs(localIntensity) / maxIntensity) * 30 : 0
  }
  const xAt = (frac: number) => xStart + (xEnd - xStart) * frac

  const positions = Array.from({ length: count }, (_, i) => i / (count - 1))

  return (
    <g>
      {/* line connecting the arrow tops -- sloped for a varying load,
          flat for a uniform one (since heightAt(0) === heightAt(1)) */}
      <line x1={xAt(0)} y1={yTip - heightAt(0)} x2={xAt(1)} y2={yTip - heightAt(1)} stroke={color} strokeWidth={2} />

      {positions.map((frac, i) => {
        const h = heightAt(frac)
        const headLen = Math.min(6, h)
        const xp = xAt(frac)
        const yStart = yTip - h
        const yShaftEnd = yTip - headLen
        return (
          <g key={i}>
            {h > 0 && <line x1={xp} y1={yStart} x2={xp} y2={yShaftEnd} stroke={color} strokeWidth={2} />}
            <polygon points={`${xp - 4},${yShaftEnd} ${xp + 4},${yShaftEnd} ${xp},${yTip}`} fill={color} />
          </g>
        )
      })}

      {isVarying ? (
        <>
          <text x={xAt(0)} y={yTip - heightAt(0) - 8} textAnchor="middle" fontSize={11} fill={color}>
            {startIntensity.toFixed(0)} {unit}
          </text>
          <text x={xAt(1)} y={yTip - heightAt(1) - 8} textAnchor="middle" fontSize={11} fill={color}>
            {endIntensity.toFixed(0)} {unit}
          </text>
        </>
      ) : (
        <text x={(xAt(0) + xAt(1)) / 2} y={yTip - heightAt(0.5) - 8} textAnchor="middle" fontSize={12} fill={color}>
          {startIntensity.toFixed(0)} {unit}
        </text>
      )}
    </g>
  )
}

interface SupportProps {
  x: number
  beamBottomY: number
  type: 'pinned' | 'roller'
  reaction?: number // omit while nothing's been solved yet
  unit?: string
}

export function Support({ x, beamBottomY, type, reaction, unit = 'N' }: SupportProps) {
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
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} ${unit}` : 'Fixed'}
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
            {reaction !== undefined ? `R = ${reaction.toFixed(0)} ${unit}` : 'Roller'}
          </text>
        </>
      )}
    </g>
  )
}