import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";

interface CardListProps {
  cards: ScheduleCard[];
  onCardClick?: (card: ScheduleCard) => void;
  emptyMessage?: string;
}

export function CardList({ cards, onCardClick, emptyMessage = "暂无日程" }: CardListProps) {
  if (!cards.length) {
    return <p style={{ color: "var(--muted)" }}>{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2">
      {cards.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onCardClick?.(c)}
            className="w-full text-left p-3 rounded border text-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--panel)", borderColor: "var(--border)", cursor: onCardClick ? "pointer" : "default" }}
          >
            <div className="font-medium">{c.title}</div>
            <div style={{ color: "var(--muted)" }}>
              {c.timeNature == null
                ? "无时间"
                : c.timeNature === "duration"
                  ? `${formatTime(c.startAt)} – ${formatTime(c.endAt)}`
                  : `截止 ${formatTime(c.deadlineAt)}`}
              {" · "}
              {c.categoryName} · 重要{c.importance === "high" ? "高" : c.importance === "low" ? "低" : "中"}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}

export function priorityBadge(importance: string, urgency: string) {
  return `${importance}/${urgency}`;
}
