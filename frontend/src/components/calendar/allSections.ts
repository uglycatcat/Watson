import type { ScheduleCard } from "../../lib/api";

export interface AllSections {
  scheduled: ScheduleCard[];
  unscheduled: ScheduleCard[];
}

export function buildAllSections(cards: ScheduleCard[]): AllSections {
  const sections: AllSections = { scheduled: [], unscheduled: [] };
  for (const card of cards) {
    if (card.startAt && card.endAt) sections.scheduled.push(card);
    else sections.unscheduled.push(card);
  }
  return sections;
}
