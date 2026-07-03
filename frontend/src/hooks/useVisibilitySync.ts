import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useVisibilitySync(enabled: boolean) {
  const queryClient = useQueryClient();
  const lastSync = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const sync = async () => {
      try {
        const data = await api.sync(lastSync.current ?? undefined);
        lastSync.current = data.serverTime;
        if (data.cards.length) {
          queryClient.invalidateQueries({ queryKey: ["cards"] });
        }
        if (data.preferences) {
          queryClient.setQueryData(["preferences"], data.preferences);
        }
      } catch {
        /* ignore */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, queryClient]);
}
