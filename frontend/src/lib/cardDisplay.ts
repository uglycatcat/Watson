import { format } from "date-fns";
import type { CardStage, ScheduleCard } from "./api";

/** Compact month+day for card chips, e.g. "0720". */
export function formatCardDateShort(iso: string): string {
  return format(new Date(iso), "MMdd");
}

/** Card time line: "未安排" | "0720" | "0720 - 0721". */
export function cardDateSubtitle(card: Pick<ScheduleCard, "startAt" | "endAt">): string {
  if (!card.startAt) return "未安排";
  const start = formatCardDateShort(card.startAt);
  if (!card.endAt) return start;
  const end = formatCardDateShort(card.endAt);
  return `${start} - ${end}`;
}

/**
 * 过期：活跃且已安排（有起止），结束时刻早于现在。
 * 非 active（含垃圾箱 completed/deleted）一律不算过期。
 * 标准卡、父卡、父卡内子卡均按各自 endAt 判定。
 */
export function isOverdueCard(
  card: Pick<ScheduleCard, "status" | "startAt" | "endAt">,
  now = Date.now(),
): boolean {
  if (card.status !== "active") return false;
  if (!card.startAt || !card.endAt) return false;
  return new Date(card.endAt).getTime() < now;
}

export function collectOverdueCardIds(
  cards: ReadonlyArray<Pick<ScheduleCard, "id" | "status" | "startAt" | "endAt">>,
  now = Date.now(),
): Set<string> {
  return new Set(cards.filter((c) => isOverdueCard(c, now)).map((c) => c.id));
}

/** 等待收尾 → 正在处理 → 未开始，同阶段按创建时间倒序 */
const STAGE_SORT_RANK: Record<CardStage, number> = {
  wrapping_up: 0,
  in_progress: 1,
  not_started: 2,
};

export function sortByStageThenCreatedAtDesc<T extends Pick<ScheduleCard, "stage" | "createdAt">>(
  cards: readonly T[],
): T[] {
  return [...cards].sort((a, b) => {
    const stageDiff =
      STAGE_SORT_RANK[a.stage ?? "not_started"] - STAGE_SORT_RANK[b.stage ?? "not_started"];
    if (stageDiff !== 0) return stageDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
