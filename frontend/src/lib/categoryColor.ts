/** Left-edge strip color from the category's assigned palette color. */
export function getCategoryAccent(categoryColor: string | null | undefined): string {
  if (!categoryColor) return "var(--border)";
  return categoryColor;
}
