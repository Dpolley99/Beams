import { hiddenLineFractions } from './CrossSectionGeometry'

interface Props {
  x1: number
  x2: number
  centerY: number
  thickness: number // schematic pixel thickness -- NOT to true length:height scale, see note below
  sectionType: string
  sectionParams: Record<string, number>
}

// Draws the beam as an actual profile with visible thickness, instead
// of a thin centerline -- solid fill for solid sections, dashed lines
// marking hollow walls / flange thickness for hollow and flanged
// sections (standard "hidden line" drafting convention: a dashed line
// shows a real feature that runs the full length but isn't directly
// visible from this side view).
//
// The thickness itself is schematic (a beam's real height:length
// ratio is usually far too slender to read at true scale over a long
// span), but the DEPTH of the hidden line within that thickness is
// mathematically correct, expressed as a fraction of the drawn
// thickness rather than an absolute distance -- see
// crossSectionGeometry.hiddenLineFractions().
export default function BeamProfile({ x1, x2, centerY, thickness, sectionType, sectionParams }: Props) {
  const topY = centerY - thickness / 2
  const { fromTop, fromBottom } = hiddenLineFractions(sectionType, sectionParams)

  return (
    <g>
      <rect x={x1} y={topY} width={x2 - x1} height={thickness} fill="#93c5fd" stroke="#1e293b" strokeWidth={1} />
      {fromTop !== null && (
        <line
          x1={x1}
          y1={topY + thickness * fromTop}
          x2={x2}
          y2={topY + thickness * fromTop}
          stroke="#1e293b"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
      )}
      {fromBottom !== null && (
        <line
          x1={x1}
          y1={topY + thickness * (1 - fromBottom)}
          x2={x2}
          y2={topY + thickness * (1 - fromBottom)}
          stroke="#1e293b"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
      )}
    </g>
  )
}