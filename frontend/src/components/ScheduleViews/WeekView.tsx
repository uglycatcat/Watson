import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import {
  MAX_CHIPS_PER_CELL,
  buildSpanSegments,
  cardsForDay,
  isMultiDay,
  singleDayCardsForCell,
} from "../calendar/cardPlacement";
import { SpanBar } from "../calendar/SpanBar";
import {
  buildWeekDays,
  DEFAULT_TIMEZONE,
  shiftWeek,
  todayInTz,
  weekDayLabel,
} from "../calendar/weekGrid";
import { DayScheduleDrawer } from "./DayScheduleDrawer";

interface WeekViewProps {
  date: string;
  onDateChange: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
}

export function WeekView({ date, onDateChange, onCardClick }: WeekViewProps) {
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  const tz = prefs?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayInTz(tz);

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "week", date],
    queryFn: () => api.getCards({ view: "week", date }),
  });

  const cards = data?.items ?? [];
  const days = useMemo(() => buildWeekDays(date, tz, today), [date, tz, today]);
  const weeks = useMemo(() => [{ days }], [days]);
  const segments = useMemo(() => buildSpanSegments(cards, weeks, tz), [cards, weeks, tz]);
  const multiDayIds = useMemo(() => new Set(cards.filter((c) => isMultiDay(c, tz)).map((c) => c.id)), [cards, tz]);
  const drawerCards = drawerDate ? cardsForDay(cards, drawerDate, tz) : [];

  if (isLoading) return <p>加载中…</p>;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h2 className="text-lg font-medium flex-1">周视图</h2>
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
          onClick={() => onDateChange(shiftWeek(date, -1, tz))}
        >
          上一周
        </button>
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
          onClick={() => onDateChange(today)}
        >
          本周
        </button>
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
          onClick={() => onDateChange(shiftWeek(date, 1, tz))}
        >
          下一周
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 relative shrink-0 min-h-[28px]">
        {segments.map((s) => (
          <SpanBar
            key={`${s.card.id}-${s.startCol}-${s.endCol}`}
            card={s.card}
            startCol={s.startCol}
            endCol={s.endCol}
            lane={s.lane}
            onClick={onCardClick}
          />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
        {days.map((cell) => {
          const chipCards = singleDayCardsForCell(cards, cell.date, tz, multiDayIds);
          const visible = chipCards.slice(0, MAX_CHIPS_PER_CELL);
          const extra = chipCards.length - visible.length;
          return (
            <div
              key={cell.date}
              className="min-h-0 h-full border rounded-lg p-2 flex flex-col"
              style={{
                background: "var(--panel)",
                borderColor: "var(--border)",
                outline: cell.isToday ? "2px solid var(--accent)" : undefined,
              }}
            >
              <div className="text-xs font-medium mb-2 shrink-0">{weekDayLabel(cell.date, tz)}</div>
              <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
                {visible.length === 0 && !segments.some((s) => cardDayInSegment(s, cell.date, days, tz)) ? (
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                    无安排
                  </p>
                ) : (
                  visible.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCardClick(c)}
                      className="relative z-10 w-full text-left truncate px-1 py-0.5 rounded text-[10px]"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {c.title}
                    </button>
                  ))
                )}
                {extra > 0 && (
                  <button
                    type="button"
                    className="relative z-10 text-[10px] text-[var(--accent)]"
                    onClick={() => setDrawerDate(cell.date)}
                  >
                    +{extra} 更多
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <DayScheduleDrawer
        date={drawerDate}
        cards={drawerCards}
        onClose={() => setDrawerDate(null)}
        onCardClick={onCardClick}
      />
    </div>
  );
}

function cardDayInSegment(
  s: { startCol: number; endCol: number },
  date: string,
  days: { date: string }[],
  _tz: string,
): boolean {
  const col = days.findIndex((d) => d.date === date);
  return col >= s.startCol && col <= s.endCol;
}
