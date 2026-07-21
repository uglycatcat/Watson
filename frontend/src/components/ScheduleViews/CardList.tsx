import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";
import { PriorityMeter } from "../cards/PriorityMeter";
import { getCategoryAccent } from "../../lib/categoryColor";

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
      {cards.map((c) => {
        const accent = getCategoryAccent(c.categoryColor);
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onCardClick?.(c)}
              className="w-full text-left text-sm transition-interactive hover:opacity-95 overflow-hidden"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                borderLeftWidth: "4px",
                borderLeftColor: accent,
                padding: "var(--space-3)",
                cursor: onCardClick ? "pointer" : "default",
              }}
            >
              <div className="font-semibold mb-1">{c.title}</div>
              <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
                {c.startAt
                  ? `${formatTime(c.startAt)}${c.endAt ? ` – ${formatTime(c.endAt)}` : ""}`
                  : "未安排"}
                {c.categoryName ? ` · ${c.categoryName}` : ""}
              </div>
              <div className="flex flex-col gap-1 max-w-[200px]">
                <PriorityMeter label="重要" value={c.importance} compact />
                <PriorityMeter label="紧急" value={c.urgency} compact />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}

export function priorityBadge(importance: number, urgency: number) {
  return `${importance}/${urgency}`;
}
