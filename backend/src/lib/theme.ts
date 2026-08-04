/** Product theme ids persisted in owner_preferences; legacy light/dark/system mapped. */
export type ThemeId = "console" | "spacex" | "light" | "dark" | "system";

/** Persist only product theme ids; map legacy light/dark/system. */
export function persistTheme(raw?: string): "console" | "spacex" | undefined {
  if (!raw) return undefined;
  if (raw === "spacex" || raw === "light") return "spacex";
  if (raw === "console" || raw === "dark" || raw === "system") return "console";
  return undefined;
}
