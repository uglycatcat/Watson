import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";

interface CardGridProps {
  cards: ScheduleCard[];
  onCardClick?: (card: ScheduleCard) => void;
  emptyMessage?: string;
}

function cardSubtitle(c: ScheduleCard): string {
  if (c.timeNature == null) return "无时间";
  if (c.timeNature === "duration") {
    return `${formatTime(c.startAt)} – ${formatTime(c.endAt)}`;
  }
  return `截止 ${formatTime(c.deadlineAt)}`;
}

export function CardGrid({ cards, onCardClick, emptyMessage = "暂无日程" }: CardGridProps) {
  if (!cards.length) {
    return <p style={{ color: "var(--muted)" }}>{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onCardClick?.(c)}
          className="text-left p-3 rounded-lg border text-sm transition-opacity hover:opacity-90 min-h-[72px]"
          style={{ background: "var(--panel)", borderColor: "var(--border)", cursor: onCardClick ? "pointer" : "default" }}
        >
          <div className="font-medium line-clamp-2">{c.title}</div>
          <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
            {cardSubtitle(c)} · {c.categoryName}
          </div>
        </button>
      ))}
    </div>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}
