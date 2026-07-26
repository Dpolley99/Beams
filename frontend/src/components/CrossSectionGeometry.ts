// Client-side mirror of the RELEVANT PART of cross_sections.py --
// just enough geometry (extents, centroid) to draw a live preview
// instantly as the user types, without a round trip to the backend
// on every keystroke. The backend remains the source of truth for
// the actual solve (I, Z, Q(y), etc.) -- this file only computes what
// a drawing needs: where the top/bottom fibers and neutral axis are.

export interface SectionExtents {
  y_min: number
  y_max: number
  ybar: number
}

// Each shape's overall real-world width, used only to auto-fit a
// silhouette into its allotted pixel width -- arbitrary/schematic,
// not tied to any other real measurement.
export function overallWidth(sectionType: string, p: Record<string, number>): number {
  switch (sectionType) {
    case 'rectangle':
      return p.b
    case 'hollow_rectangle':
      return p.b_out
    case 'circle':
      return p.d
    case 'hollow_circle':
      return p.d_out
    case 'channel':
    case 'i_section':
    case 't_section':
      return p.B
    default:
      return 1
  }
}

export function computeExtents(sectionType: string, p: Record<string, number>): SectionExtents {
  switch (sectionType) {
    case 'rectangle':
      return { y_min: -p.h / 2, y_max: p.h / 2, ybar: p.h / 2 }
    case 'hollow_rectangle':
      return { y_min: -p.h_out / 2, y_max: p.h_out / 2, ybar: p.h_out / 2 }
    case 'circle':
      return { y_min: -p.d / 2, y_max: p.d / 2, ybar: p.d / 2 }
    case 'hollow_circle':
      return { y_min: -p.d_out / 2, y_max: p.d_out / 2, ybar: p.d_out / 2 }
    case 'channel':
    case 'i_section':
      return { y_min: -p.H / 2, y_max: p.H / 2, ybar: p.H / 2 }
    case 't_section': {
      const webH = p.H - p.tf
      const a1 = p.tw * webH
      const y1 = webH / 2
      const a2 = p.B * p.tf
      const y2 = p.H - p.tf / 2
      const ybar = (a1 * y1 + a2 * y2) / (a1 + a2)
      return { y_min: -ybar, y_max: p.H - ybar, ybar }
    }
    default:
      return { y_min: -0.5, y_max: 0.5, ybar: 0.5 }
  }
}

// True if every field this shape needs is present and forms a valid
// (positive, non-degenerate) section -- guards against NaN/blank
// inputs while the user is mid-edit.
export function isValidSection(sectionType: string, p: Record<string, number>): boolean {
  const values = Object.values(p)
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return false

  if (sectionType === 'hollow_rectangle') return p.b_in < p.b_out && p.h_in < p.h_out
  if (sectionType === 'hollow_circle') return p.d_in < p.d_out
  if (sectionType === 'channel' || sectionType === 'i_section' || sectionType === 't_section') {
    return 2 * p.tf < p.H && p.tw < p.B
  }
  return true
}

export interface HiddenLineFractions {
  fromTop: number | null // how far to inset the dashed line from the top surface, as a FRACTION of the drawn thickness -- null means no hidden line on that side (solid)
  fromBottom: number | null
}

// A beam's real height:length ratio is usually far too slender to
// draw the elevation to true proportion (a 0.1m-tall, 16m-long beam
// would be a barely-visible hairline) -- so the elevation is drawn as
// a fixed schematic thickness. But the INTERNAL detail (how deep a
// hollow wall or flange sits) can still be geometrically correct
// relative to that schematic thickness, by expressing it as a
// fraction rather than an absolute distance. This is what makes that
// possible for each shape.
export function hiddenLineFractions(sectionType: string, p: Record<string, number>): HiddenLineFractions {
  switch (sectionType) {
    case 'hollow_rectangle': {
      const frac = (p.h_out - p.h_in) / 2 / p.h_out
      return { fromTop: frac, fromBottom: frac }
    }
    case 'hollow_circle': {
      const frac = (p.d_out - p.d_in) / 2 / p.d_out
      return { fromTop: frac, fromBottom: frac }
    }
    case 'channel':
    case 'i_section': {
      const frac = p.tf / p.H
      return { fromTop: frac, fromBottom: frac }
    }
    case 't_section': {
      // only ONE flange (at the top) -- no hidden line at the bottom,
      // since the web runs straight to the bottom fiber with nothing
      // to mark there
      return { fromTop: p.tf / p.H, fromBottom: null }
    }
    default:
      // solid rectangle, solid circle -- nothing hidden
      return { fromTop: null, fromBottom: null }
  }
}