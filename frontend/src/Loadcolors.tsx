// Shared color palette so every load (point or distributed) gets its
// own distinct, consistent color, cycling if there are more loads
// than colors in the list.
export const LOAD_COLORS = ['#f97316', '#16a34a', '#2563eb', '#db2777', '#9333ea', '#0891b2', '#ca8a04', '#dc2626']

export function colorForIndex(i: number): string {
  return LOAD_COLORS[i % LOAD_COLORS.length]
}