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
