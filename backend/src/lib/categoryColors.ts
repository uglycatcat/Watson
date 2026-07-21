/**
 * Category left-edge accents tuned for dark UI backgrounds.
 * Prefer lighter / mid-bright hues (≈ Tailwind 300–400 / GitHub dark accents)
 * so strips stay distinct without neon vibration on near-black panels.
 */
export const CATEGORY_COLOR_PALETTE = [
  "#FF7B72", // coral
  "#FFA657", // amber-orange
  "#E3B341", // gold
  "#7EE787", // mint green
  "#3FB950", // green
  "#39C5CF", // cyan
  "#58A6FF", // sky blue
  "#A371F7", // violet
  "#F778BA", // pink
  "#8B949E", // cool gray
] as const;

export type CategoryColor = (typeof CATEGORY_COLOR_PALETTE)[number];

/** Prefer an unused palette color; if all taken, pick the least-used. */
export function allocateCategoryColor(usedColors: Iterable<string | null | undefined>): string {
  const counts = new Map<string, number>();
  for (const c of CATEGORY_COLOR_PALETTE) counts.set(c, 0);
  for (const used of usedColors) {
    if (!used) continue;
    counts.set(used, (counts.get(used) ?? 0) + 1);
  }
  for (const c of CATEGORY_COLOR_PALETTE) {
    if ((counts.get(c) ?? 0) === 0) return c;
  }
  let best: string = CATEGORY_COLOR_PALETTE[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const c of CATEGORY_COLOR_PALETTE) {
    const n = counts.get(c) ?? 0;
    if (n < bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

export function isPaletteColor(color: string | null | undefined): boolean {
  if (!color) return false;
  return (CATEGORY_COLOR_PALETTE as readonly string[]).includes(color);
}
