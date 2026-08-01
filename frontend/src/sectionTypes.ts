// Describes every section type the backend's cross_sections.py
// supports -- one place that defines "what fields does this shape
// need, and what should they default to." Both BeamForm (the inputs)
// and, later, any cross-section preview component can share this
// same config instead of each hardcoding their own copy.

export interface SectionField {
  key: string
  label: string
  default: number
}

export const SECTION_LABELS: Record<string, string> = {
  rectangle: 'Rectangle',
  hollow_rectangle: 'Hollow rectangle',
  circle: 'Circle',
  hollow_circle: 'Hollow circle',
  channel: 'Channel (C-section)',
  i_section: 'I-section',
  t_section: 'T-section',
}

export const SECTION_FIELDS: Record<string, SectionField[]> = {
  rectangle: [
    { key: 'b', label: 'Width b', default: 0.1 },
    { key: 'h', label: 'Height h', default: 0.1 },
  ],
  hollow_rectangle: [
    { key: 'b_out', label: 'Outer width b_out', default: 0.12 },
    { key: 'h_out', label: 'Outer height h_out', default: 0.12 },
    { key: 'b_in', label: 'Inner width b_in', default: 0.08 },
    { key: 'h_in', label: 'Inner height h_in', default: 0.08 },
  ],
  circle: [{ key: 'd', label: 'Diameter d', default: 0.1 }],
  hollow_circle: [
    { key: 'd_out', label: 'Outer diameter d_out', default: 0.12 },
    { key: 'd_in', label: 'Inner diameter d_in', default: 0.08 },
  ],
  channel: [
    { key: 'H', label: 'Overall height H', default: 0.1 },
    { key: 'B', label: 'Flange width B', default: 0.06 },
    { key: 'tw', label: 'Web thickness tw', default: 0.008 },
    { key: 'tf', label: 'Flange thickness tf', default: 0.01 },
  ],
  i_section: [
    { key: 'H', label: 'Overall height H', default: 0.1 },
    { key: 'B', label: 'Flange width B', default: 0.06 },
    { key: 'tw', label: 'Web thickness tw', default: 0.008 },
    { key: 'tf', label: 'Flange thickness tf', default: 0.01 },
  ],
  t_section: [
    { key: 'H', label: 'Overall height H', default: 0.1 },
    { key: 'B', label: 'Flange width B', default: 0.06 },
    { key: 'tw', label: 'Web thickness tw', default: 0.008 },
    { key: 'tf', label: 'Flange thickness tf', default: 0.01 },
  ],
}

export function defaultParamsFor(sectionType: string): Record<string, number> {
  const fields = SECTION_FIELDS[sectionType] ?? []
  return Object.fromEntries(fields.map((f) => [f.key, f.default]))
}