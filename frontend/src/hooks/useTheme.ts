import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useTheme() {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: api.getPreferences,
  });

  const mutation = useMutation({
    mutationFn: (theme: "light" | "dark" | "system") => api.patchPreferences({ theme }),
    onSuccess: (data) => qc.setQueryData(["preferences"], data),
  });

  useEffect(() => {
    const theme = prefs?.theme ?? "system";
    const root = document.documentElement;
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
  }, [prefs?.theme]);

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const current = prefs?.theme ?? "system";
    const next = order[(order.indexOf(current) + 1) % order.length];
    mutation.mutate(next);
  };

  return { theme: prefs?.theme ?? "system", cycleTheme };
}
