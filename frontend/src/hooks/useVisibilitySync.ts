import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useVisibilitySync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ["cards"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["categories"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["daily-report"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["monthly-report"], type: "active" }),
      ]);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const timer = window.setInterval(refresh, 3000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, queryClient]);
}
