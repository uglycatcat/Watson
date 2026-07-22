import { format } from "date-fns";
import type { ScheduleCard } from "./api";

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
