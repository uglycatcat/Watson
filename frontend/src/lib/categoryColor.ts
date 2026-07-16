/** Stable accent from categoryId for left-edge color strip (no backend color field). */
export function getCategoryAccent(categoryId: string | null | undefined): string {
  if (!categoryId) return "var(--border)";
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const isDark = document.documentElement.classList.contains("dark");
  const sat = isDark ? 42 : 48;
  const light = isDark ? 52 : 46;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
