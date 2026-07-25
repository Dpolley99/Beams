// The actual SVG shape for each section type -- shared between the
// results-page silhouette (ShearStressProfile.tsx, using the
// backend's computed extents) and the live form preview
// (CrossSectionPreview.tsx, using client-side computeExtents()).
// Neither knows or cares where y_min/y_max/ybar came from.

export interface ShapeProps {
  sectionType: string
  params: Record<string, number>
  ybar: number // needed only by t_section, to find where the web ends / flange begins
  yMinForShape: number // = -ybar in every shape's own coordinate convention
  pixelX: (x: number) => number
  yToPixel: (y: number) => number
  scaleX: number
  scaleY: number
}

const FILL = '#94a3b8'
const STROKE = '#1e293b'

export default function CrossSectionShape({ sectionType, params, ybar, yMinForShape, pixelX, yToPixel, scaleX, scaleY }: ShapeProps) {
  if (sectionType === 'rectangle') {
    const { b, h } = params
    return (
      <rect
        x={pixelX(-b / 2)}
        y={yToPixel(h / 2)}
        width={b * scaleX}
        height={h * scaleY}
        fill={FILL}
        stroke={STROKE}
        strokeWidth={1.5}
      />
    )
  }

  if (sectionType === 'hollow_rectangle') {
    const { b_out, h_out, b_in, h_in } = params
    return (
      <>
        <rect
          x={pixelX(-b_out / 2)}
          y={yToPixel(h_out / 2)}
          width={b_out * scaleX}
          height={h_out * scaleY}
          fill={FILL}
          stroke={STROKE}
          strokeWidth={1.5}
        />
        <rect
          x={pixelX(-b_in / 2)}
          y={yToPixel(h_in / 2)}
          width={b_in * scaleX}
          height={h_in * scaleY}
          fill="white"
          stroke={STROKE}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </>
    )
  }

  if (sectionType === 'circle') {
    const r = params.d / 2
    return <ellipse cx={pixelX(0)} cy={yToPixel(0)} rx={r * scaleX} ry={r * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1.5} />
  }

  if (sectionType === 'hollow_circle') {
    const rOut = params.d_out / 2
    const rIn = params.d_in / 2
    return (
      <>
        <ellipse cx={pixelX(0)} cy={yToPixel(0)} rx={rOut * scaleX} ry={rOut * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1.5} />
        <ellipse
          cx={pixelX(0)}
          cy={yToPixel(0)}
          rx={rIn * scaleX}
          ry={rIn * scaleY}
          fill="white"
          stroke={STROKE}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </>
    )
  }

  if (sectionType === 'channel') {
    // A real C-channel: web on ONE side, both flanges extend the same
    // direction from it (open on the other side) -- visually distinct
    // from an I-section, even though our backend's math treats them
    // identically for vertical bending (the open side doesn't affect
    // that). Local x is shifted so the web sits at the LEFT edge of
    // the overall width B, with both flanges spanning the full width
    // B to the right of it.
    const { H, B, tw, tf } = params
    const halfH = H / 2
    const left = -B / 2
    return (
      <>
        {/* bottom flange */}
        <rect x={pixelX(left)} y={yToPixel(-halfH + tf)} width={B * scaleX} height={tf * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
        {/* web, at the left edge only */}
        <rect x={pixelX(left)} y={yToPixel(halfH - tf)} width={tw * scaleX} height={(H - 2 * tf) * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
        {/* top flange */}
        <rect x={pixelX(left)} y={yToPixel(halfH)} width={B * scaleX} height={tf * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
      </>
    )
  }

  if (sectionType === 'i_section') {
    // Symmetric wide-flange: web centered, flanges extend equally on
    // both sides.
    const { H, B, tw, tf } = params
    const halfH = H / 2
    return (
      <>
        <rect x={pixelX(-B / 2)} y={yToPixel(-halfH + tf)} width={B * scaleX} height={tf * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
        <rect x={pixelX(-tw / 2)} y={yToPixel(halfH - tf)} width={tw * scaleX} height={(H - 2 * tf) * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
        <rect x={pixelX(-B / 2)} y={yToPixel(halfH)} width={B * scaleX} height={tf * scaleY} fill={FILL} stroke={STROKE} strokeWidth={1} />
      </>
    )
  }

  if (sectionType === 't_section') {
    const { H, B, tw, tf } = params
    const webHRel = H - tf - ybar
    const cTop = H - ybar
    const cBottom = yMinForShape // = -ybar

    return (
      <>
        <rect
          x={pixelX(-tw / 2)}
          y={yToPixel(webHRel)}
          width={tw * scaleX}
          height={(webHRel - cBottom) * scaleY}
          fill={FILL}
          stroke={STROKE}
          strokeWidth={1}
        />
        <rect
          x={pixelX(-B / 2)}
          y={yToPixel(cTop)}
          width={B * scaleX}
          height={(cTop - webHRel) * scaleY}
          fill={FILL}
          stroke={STROKE}
          strokeWidth={1}
        />
      </>
    )
  }

  return null
}