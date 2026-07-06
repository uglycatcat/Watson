import { format } from "date-fns";
import type { ScheduleCard } from "../../lib/api";
import { Drawer } from "../ui/Drawer";

interface DayScheduleDrawerProps {
  date: string | null;
  cards: ScheduleCard[];
  onClose: () => void;
  onCardClick: (card: ScheduleCard) => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}

export function DayScheduleDrawer({ date, cards, onClose, onCardClick }: DayScheduleDrawerProps) {
  return (
    <Drawer open={!!date} onClose={onClose} side="left" title={date ? `${date} 全部日程` : undefined}>
      {!cards.length ? (
        <p style={{ color: "var(--muted)" }}>该日无安排</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onCardClick(c)}
                className="w-full text-left p-3 rounded border text-sm"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <div className="font-medium">{c.title}</div>
                <div style={{ color: "var(--muted)" }}>
                  {c.timeNature === "duration"
                    ? `${formatTime(c.startAt)} – ${formatTime(c.endAt)}`
                    : `截止 ${formatTime(c.deadlineAt)}`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
