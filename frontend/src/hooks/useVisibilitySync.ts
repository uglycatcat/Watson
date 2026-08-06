import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Category,
  type DailyReport,
  type MonthlyReport,
  type SyncCardMeta,
} from "../lib/api";

/**
 * Heartbeat while the tab stays visible.
 * Spec 007 FR-035 asked for 3s; that interval caused a perceptible remote UI hitch
 * every tick even when sync returned no card changes. Visibility/focus still sync
 * immediately; 60s bounds multi-device drift without janking interactions.
 */
const SYNC_HEARTBEAT_MS = 60_000;
/** Defer sync if the user interacted this recently (avoid hitch mid-click). */
const INPUT_QUIET_MS = 500;

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
 * Multi-device sync via GET /api/sync.
 * Idle path: tiny `{ unchanged: true }` when fingerprints match — no React Query writes.
 */
export function useVisibilitySync(enabled: boolean) {
  const queryClient = useQueryClient();
  const sinceRef = useRef<string | null>(null);
  const cardMetaRef = useRef<SyncCardMeta | null>(null);
  const catSigRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const lastInputRef = useRef(0);
  const deferTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const markInput = () => {
      lastInputRef.current = Date.now();
    };

    const apply = async (force = false) => {
      if (document.visibilityState !== "visible") return;
      if (inFlightRef.current) return;

      if (!force && Date.now() - lastInputRef.current < INPUT_QUIET_MS) {
        if (deferTimerRef.current != null) window.clearTimeout(deferTimerRef.current);
        deferTimerRef.current = window.setTimeout(() => {
          deferTimerRef.current = null;
          void apply(false);
        }, INPUT_QUIET_MS);
        return;
      }

      inFlightRef.current = true;
      try {
        const aligning = sinceRef.current === null;
        const data = await api.sync(
          aligning
            ? undefined
            : {
                since: sinceRef.current!,
                cardMeta: cardMetaRef.current ?? undefined,
                catSig: catSigRef.current ?? undefined,
              },
        );
        sinceRef.current = data.serverTime;

        // Nothing changed — do not touch React Query (this is the idle hot path).
        if (data.unchanged) return;

        if (
          !aligning &&
          data.cardMeta &&
          ((data.cards?.length ?? 0) > 0 || cardMetaChanged(cardMetaRef.current, data.cardMeta))
        ) {
          void queryClient.invalidateQueries({ queryKey: ["cards"], type: "active" });
        }
        if (data.cardMeta) cardMetaRef.current = data.cardMeta;
        if (data.catSig) catSigRef.current = data.catSig;

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
      if (document.visibilityState === "visible") void apply(true);
    };
    const onFocus = () => void apply(true);

    void apply(true);
    const timer = window.setInterval(() => void apply(false), SYNC_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pointerdown", markInput, true);
    window.addEventListener("keydown", markInput, true);

    return () => {
      window.clearInterval(timer);
      if (deferTimerRef.current != null) window.clearTimeout(deferTimerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pointerdown", markInput, true);
      window.removeEventListener("keydown", markInput, true);
    };
  }, [enabled, queryClient]);
}
