// Shared source -> chart colour map, mirroring the CSS variables so charts and
// table dots stay consistent.
import type { SourceType } from '../../engine'

export const SOURCE_COLOR: Record<SourceType, string> = {
  psa: '#0f7c8b',
  lmo: '#2b8a3e',
  cylinder: '#b5852a',
  oc: '#7048a8',
}

// Per-instance shades so multiple units of one source stay distinguishable.
const SHADES: Record<SourceType, string[]> = {
  psa: ['#0f7c8b', '#15a3b6', '#0a5b66', '#56c2d0'],
  lmo: ['#2b8a3e', '#40a557', '#1c5f2a', '#69c97f'],
  cylinder: ['#b5852a', '#d2a44a', '#8a6418', '#e2c074'],
  oc: ['#7048a8', '#8c63c4', '#503080', '#a98bd6'],
}

/** Colour for instance `index` of a source type. */
export function instanceColor(source: SourceType, index: number): string {
  const shades = SHADES[source]
  return shades[index % shades.length]
}
