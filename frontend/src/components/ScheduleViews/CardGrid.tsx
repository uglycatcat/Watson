import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";
import { CompleteCheckbox } from "../cards/CompleteCheckbox";

export type CardGridSortMode = "createdAtDesc" | "preserve";

interface CardGridProps {
  cards: ScheduleCard[];
  onCardClick?: (card: ScheduleCard) => void;
  emptyMessage?: string;
  showComplete?: boolean;
  /** Default createdAt DESC; use "preserve" when caller already ordered (e.g. trash trashedAt) */
  sortMode?: CardGridSortMode;
  renderCardChrome?: (card: ScheduleCard) => ReactNode;
}

function cardSubtitle(c: ScheduleCard): string {
  if (!c.startAt) return "未安排";
  const start = formatTime(c.startAt);
  const end = c.endAt ? formatTime(c.endAt) : null;
  return end ? `${start} – ${end}` : start;
}

function sortByCreatedAtDesc(cards: ScheduleCard[]): ScheduleCard[] {
  return [...cards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function CardGrid({
  cards,
  onCardClick,
  emptyMessage = "暂无日程",
  showComplete = false,
  sortMode = "createdAtDesc",
  renderCardChrome,
}: CardGridProps) {
  const sorted = useMemo(() => {
    if (sortMode === "preserve") return cards;
    return sortByCreatedAtDesc(cards);
  }, [cards, sortMode]);

  if (!sorted.length) {
    return <p style={{ color: "var(--muted)" }}>{emptyMessage}</p>;
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
    >
      {sorted.map((c) => (
        <div key={c.id} className="relative">
          <div
            role={onCardClick ? "button" : undefined}
            tabIndex={onCardClick ? 0 : undefined}
            onClick={() => onCardClick?.(c)}
            onKeyDown={(e) => {
              if (!onCardClick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick(c);
              }
            }}
            className="w-full text-left p-3 rounded-lg border text-sm transition-opacity hover:opacity-90 min-h-[72px] flex gap-2"
            style={{
              background: "var(--panel)",
              borderColor: "var(--border)",
              cursor: onCardClick ? "pointer" : "default",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium line-clamp-2">{c.title}</div>
              <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                {cardSubtitle(c)} · {c.categoryName} · 重要{c.importance} 紧急{c.urgency}
              </div>
            </div>
            {showComplete && (
              <CompleteCheckbox cardId={c.id} className="mt-0.5" />
            )}
          </div>
          {renderCardChrome?.(c)}
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}
