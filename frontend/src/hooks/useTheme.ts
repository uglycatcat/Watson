import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "./useAuth";

/** Product themes — not light/dark. CONSOLE = current mission-control look; SPACEX = upcoming. */
export type Theme = "console" | "spacex";

/** Map legacy prefs + current ids onto the two product themes. */
function normalizeTheme(raw?: string): Theme {
  if (raw === "spacex" || raw === "light") return "spacex";
  // console | dark | system | unknown → console (default product theme)
  return "console";
}

export function useTheme() {
  const qc = useQueryClient();
  const { authenticated } = useAuth();
  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: api.getPreferences,
    enabled: authenticated === true,
  });

  const theme = normalizeTheme(prefs?.theme);

  const mutation = useMutation({
    mutationFn: (next: Theme) => api.patchPreferences({ theme: next }),
    onSuccess: (data) => qc.setQueryData(["preferences"], data),
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "console", "spacex");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    mutation.mutate(theme === "console" ? "spacex" : "console");
  };

  return { theme, toggleTheme };
}
