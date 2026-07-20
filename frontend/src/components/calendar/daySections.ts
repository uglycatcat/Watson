import type { ScheduleCard } from "../../lib/api";
import { formatDayInTz } from "./tz";

export interface DaySections {
  dueToday: ScheduleCard[];
  inProgress: ScheduleCard[];
  startingToday: ScheduleCard[];
}

export function buildDaySections(cards: ScheduleCard[], date: string, timezone: string): DaySections {
  const sections: DaySections = { dueToday: [], inProgress: [], startingToday: [] };
  for (const card of cards) {
    if (!card.startAt || !card.endAt) continue;
    const startDay = formatDayInTz(card.startAt, timezone);
    const endDay = formatDayInTz(card.endAt, timezone);
    if (endDay === date) sections.dueToday.push(card);
    else if (startDay < date && endDay > date) sections.inProgress.push(card);
    else if (startDay === date) sections.startingToday.push(card);
  }
  return sections;
}
