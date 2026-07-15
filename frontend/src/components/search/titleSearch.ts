import type { ScheduleCard } from "../../lib/api";

const MAX_RESULTS = 8;

function scatterMatch(title: string, query: string): boolean {
  const t = title.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return false;
  if (t.includes(q)) return true;
  let ti = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (ti === -1) return false;
    ti += 1;
  }
  return true;
}

function scoreMatch(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q || !scatterMatch(title, query)) return -1;
  const idx = t.indexOf(q);
  if (idx >= 0) return 1000 - idx;
  let ti = 0;
  let first = -1;
  let last = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (first === -1) first = ti;
    last = ti;
    ti += 1;
  }
  return 500 - first - (last - first);
}

export interface SearchResult {
  card: ScheduleCard;
  score: number;
}

export function trashStatusLabel(card: ScheduleCard): string | null {
  if (card.status === "completed") return "已完成";
  if (card.status === "deleted") return "已删除";
  return null;
}

export function searchTitles(cards: ScheduleCard[], query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const scored = cards
    .map((card) => ({ card, score: scoreMatch(card.title, q) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.card.title.localeCompare(b.card.title, "zh-CN");
    });
  return scored.slice(0, MAX_RESULTS);
}

export const SEARCH_MAX = MAX_RESULTS;

export function hasMoreResults(cards: ScheduleCard[], query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  return cards.filter((c) => scatterMatch(c.title, q)).length > MAX_RESULTS;
}
