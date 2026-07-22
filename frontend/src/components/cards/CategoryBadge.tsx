import { getCategoryAccent } from "../../lib/categoryColor";

export function CategoryBadge({
  name,
  color,
  compact = false,
}: {
  name?: string | null;
  color?: string | null;
  compact?: boolean;
}) {
  if (!name) return null;
  const accent = getCategoryAccent(color);
  return (
    <span
      className={`category-badge ${compact ? "category-badge-compact" : ""}`}
      title={`分类：${name}`}
      style={{
        color: accent,
        background: `color-mix(in srgb, ${accent} 18%, transparent)`,
        borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
      }}
    >
      {name}
    </span>
  );
}
