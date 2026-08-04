import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Category,
  type DailyReport,
  type MonthlyReport,
  type SyncCardMeta,
} from "../lib/api";

/** Multi-device freshness target (spec 007 FR-035). */
const SYNC_INTERVAL_MS = 3000;

function categoriesEqual(a: Category[] | undefined, b: Category[]): boolean {
  if (!a || a.length !== b.length) return false;
  const byId = new Map(a.map((c) => [c.id, c]));
  for (const c of b) {
    const prev = byId.get(c.id);
    if (!prev || prev.name !== c.name || prev.isPreset !== c.isPreset || prev.deletable !== c.deletable) {
      return false;
    }
  }
  return true;
}

function cardMetaChanged(prev: SyncCardMeta | null, next: SyncCardMeta): boolean {
  if (!prev) return false;
  return prev.count !== next.count || prev.maxUpdatedAt !== next.maxUpdatedAt;
}

/**
 * Multi-device sync via lightweight GET /api/sync?since=.
 * Idle tabs issue one cheap poll every 3s; list/detail queries refetch only when
 * the payload shows real changes (not a full cards/categories/reports refetch storm).
 */
export function useVisibilitySync(enabled: boolean) {
  const queryClient = useQueryClient();
  /** null until aligned with serverTime (avoids client-clock skew gaps). */
  const sinceRef = useRef<string | null>(null);
  const cardMetaRef = useRef<SyncCardMeta | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const apply = async () => {
      if (document.visibilityState !== "visible") return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const aligning = sinceRef.current === null;
        const data = await api.sync(aligning ? undefined : sinceRef.current!);
        sinceRef.current = data.serverTime;

        if (!aligning && (data.cards.length > 0 || cardMetaChanged(cardMetaRef.current, data.cardMeta))) {
          void queryClient.invalidateQueries({ queryKey: ["cards"] });
        }
        cardMetaRef.current = data.cardMeta;

        if (data.preferences) {
          queryClient.setQueryData(["preferences"], data.preferences);
        }

        if (data.categories) {
          const prev = queryClient.getQueryData<{ items: Category[] }>(["categories"]);
          if (!categoriesEqual(prev?.items, data.categories)) {
            queryClient.setQueryData(["categories"], { items: data.categories });
          }
        }

        for (const report of data.dailyReports ?? []) {
          queryClient.setQueryData<{ item: DailyReport | null }>(["daily-report", report.date], {
            item: report,
          });
        }

        for (const report of data.monthlyReports ?? []) {
          queryClient.setQueryData<{ item: MonthlyReport | null }>(["monthly-report", report.month], {
            item: report,
          });
        }
      } catch {
        /* transient network errors — next tick retries; since stays put on failure */
      } finally {
        inFlightRef.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void apply();
    };

    // First tick aligns serverTime/cardMeta without invalidating (initial queries already loaded).
    void apply();
    const timer = window.setInterval(() => void apply(), SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, queryClient]);
}
