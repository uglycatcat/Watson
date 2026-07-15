import type { ScheduleCard } from "../../lib/api";
import { priorityScore } from "../../lib/api";
import { addDayInTz, formatDayInTz } from "./tz";

export function compareCards(a: ScheduleCard, b: ScheduleCard): number {
  return priorityScore(b.importance, b.urgency) - priorityScore(a.importance, a.urgency);
}

export function cardDayKeys(card: ScheduleCard, tz: string): string[] {
  if (!card.startAt) return [];
  const end = card.endAt ?? card.startAt;
  const days: string[] = [];
  let cur = formatDayInTz(card.startAt, tz);
  const endDay = formatDayInTz(end, tz);
  while (cur <= endDay) {
    days.push(cur);
    cur = addDayInTz(cur, 1, tz);
  }
  return days;
}

export function isMultiDay(card: ScheduleCard, tz: string): boolean {
  return cardDayKeys(card, tz).length > 1;
}

export function cardsForDay(cards: ScheduleCard[], day: string, tz: string): ScheduleCard[] {
  return cards
    .filter((c) => cardDayKeys(c, tz).includes(day))
    .sort(compareCards);
}

export const MAX_CHIPS_PER_CELL = 3;

export interface SpanSegment {
  card: ScheduleCard;
  weekIndex: number;
  startCol: number;
  endCol: number;
  lane: number;
}

export function buildSpanSegments(
  cards: ScheduleCard[],
  weeks: { days: { date: string }[] }[],
  tz: string,
): SpanSegment[] {
  const dateToPos = new Map<string, { weekIndex: number; col: number }>();
  weeks.forEach((w, wi) => {
    w.days.forEach((d, col) => dateToPos.set(d.date, { weekIndex: wi, col }));
  });

  const multiDay = cards.filter((c) => isMultiDay(c, tz)).sort(compareCards);
  const segments: Omit<SpanSegment, "lane">[] = [];

  for (const card of multiDay) {
    const days = cardDayKeys(card, tz).filter((d) => dateToPos.has(d));
    if (!days.length) continue;

    let runStart = days[0];
    let runEnd = days[0];
    let runWeek = dateToPos.get(days[0])!.weekIndex;

    const flush = () => {
      const startPos = dateToPos.get(runStart)!;
      const endPos = dateToPos.get(runEnd)!;
      if (startPos.weekIndex === runWeek && endPos.weekIndex === runWeek) {
        segments.push({
          card,
          weekIndex: runWeek,
          startCol: startPos.col,
          endCol: endPos.col,
        });
      }
    };

    for (let i = 1; i < days.length; i++) {
      const d = days[i];
      const pos = dateToPos.get(d)!;
      const prev = dateToPos.get(days[i - 1])!;
      const consecutive = addDayInTz(days[i - 1], 1, tz) === d && pos.weekIndex === prev.weekIndex;
      if (consecutive) {
        runEnd = d;
      } else {
        flush();
        runStart = d;
        runEnd = d;
        runWeek = pos.weekIndex;
      }
    }
    flush();
  }

  return assignLanes(segments);
}

function assignLanes(segments: Omit<SpanSegment, "lane">[]): SpanSegment[] {
  const byWeek = new Map<number, Omit<SpanSegment, "lane">[]>();
  for (const s of segments) {
    if (!byWeek.has(s.weekIndex)) byWeek.set(s.weekIndex, []);
    byWeek.get(s.weekIndex)!.push(s);
  }

  const result: SpanSegment[] = [];
  for (const [, list] of byWeek) {
    const sorted = [...list].sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
    const lanes: { endCol: number }[] = [];
    for (const seg of sorted) {
      let lane = lanes.findIndex((l) => l.endCol < seg.startCol);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push({ endCol: seg.endCol });
      } else {
        lanes[lane].endCol = seg.endCol;
      }
      result.push({ ...seg, lane });
    }
  }
  return result;
}

export function singleDayCardsForCell(
  cards: ScheduleCard[],
  day: string,
  tz: string,
  multiDayIds: Set<string>,
): ScheduleCard[] {
  return cards
    .filter((c) => !multiDayIds.has(c.id) && cardDayKeys(c, tz).includes(day))
    .sort(compareCards);
}

export function allCardsForCell(
  cards: ScheduleCard[],
  day: string,
  tz: string,
): ScheduleCard[] {
  return cards
    .filter((c) => cardDayKeys(c, tz).includes(day))
    .sort(compareCards);
}
