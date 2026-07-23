import { useTheme } from "../hooks/useTheme";

/** Keeps `<html class="console|spacex">` in sync with preferences app-wide (incl. login). */
export function ThemeSync() {
  useTheme();
  return null;
}
