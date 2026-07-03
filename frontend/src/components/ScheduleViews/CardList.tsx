import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";

export function CardList({ cards }: { cards: ScheduleCard[] }) {
  if (!cards.length) {
    return <p style={{ color: "var(--muted)" }}>暂无日程</p>;
  }
  return (
    <ul className="space-y-2">
      {cards.map((c) => (
        <li
          key={c.id}
          className="p-3 rounded border text-sm"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <div className="font-medium">{c.title}</div>
          <div style={{ color: "var(--muted)" }}>
            {c.timeNature === "duration"
              ? `${formatTime(c.startAt)} – ${formatTime(c.endAt)}`
              : `截止 ${formatTime(c.deadlineAt)}`}
            {" · "}
            {c.categoryName} · 重要{c.importance === "high" ? "高" : c.importance === "low" ? "低" : "中"}
          </div>
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
