import type { ScheduleCard } from "../../lib/api";
import { formatDayInTz } from "./tz";

export interface TrashSection {
  /** yyyy-MM-dd；无 trashedAt 时为空字符串 */
  day: string;
  /** 展示用 MM-dd */
  label: string;
  cards: ScheduleCard[];
}

function sectionLabel(day: string): string {
  if (!day) return "未知";
  return day.slice(5); // yyyy-MM-dd → MM-dd
}

/** 按移入垃圾箱的日期分组；仅包含有卡片的日期，新日期在前。 */
export function buildTrashSections(cards: ScheduleCard[], timezone: string): TrashSection[] {
  const byDay = new Map<string, ScheduleCard[]>();
  for (const card of cards) {
    const day = card.trashedAt ? formatDayInTz(card.trashedAt, timezone) : "";
    const list = byDay.get(day);
    if (list) list.push(card);
    else byDay.set(day, [card]);
  }

  const days = [...byDay.keys()].sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return b.localeCompare(a);
  });

  return days.map((day) => {
    const sectionCards = [...(byDay.get(day) ?? [])].sort((a, b) => {
      const ta = a.trashedAt ? new Date(a.trashedAt).getTime() : 0;
      const tb = b.trashedAt ? new Date(b.trashedAt).getTime() : 0;
      return tb - ta;
    });
    return { day, label: sectionLabel(day), cards: sectionCards };
  });
}
