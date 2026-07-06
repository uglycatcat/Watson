import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/api";

export type Theme = "light" | "dark";

function normalizeTheme(raw?: string): Theme {
  return raw === "dark" ? "dark" : "light";
}

export function useTheme() {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: api.getPreferences,
  });

  const theme = normalizeTheme(prefs?.theme);

  const mutation = useMutation({
    mutationFn: (next: Theme) => api.patchPreferences({ theme: next }),
    onSuccess: (data) => qc.setQueryData(["preferences"], data),
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    mutation.mutate(theme === "light" ? "dark" : "light");
  };

  return { theme, toggleTheme };
}
