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
import { buildMonthGrid, DEFAULT_TIMEZONE, monthLabel, todayInTz } from "../calendar/tz";
import { DayScheduleDrawer } from "./DayScheduleDrawer";

interface MonthViewProps {
  date: string;
  onCardClick: (card: ScheduleCard) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function MonthView({ date, onCardClick }: MonthViewProps) {
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  const tz = prefs?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayInTz(tz);

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "month", date],
    queryFn: () => api.getCards({ view: "month", date }),
  });

  const cards = data?.items ?? [];
  const weeks = useMemo(() => buildMonthGrid(date, tz, today), [date, tz, today]);
  const segments = useMemo(() => buildSpanSegments(cards, weeks, tz), [cards, weeks, tz]);
  const multiDayIds = useMemo(() => new Set(cards.filter((c) => isMultiDay(c, tz)).map((c) => c.id)), [cards, tz]);

  const drawerCards = drawerDate ? cardsForDay(cards, drawerDate, tz) : [];

  if (isLoading) return <p>加载中…</p>;

  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-lg font-medium mb-3 shrink-0">{monthLabel(date, tz)}</h2>
      <div className="grid grid-cols-7 gap-px text-xs mb-1 shrink-0" style={{ color: "var(--muted)" }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px relative flex-1 min-h-0">
            {week.days.map((cell) => {
              const chipCards = singleDayCardsForCell(cards, cell.date, tz, multiDayIds);
              const visible = chipCards.slice(0, MAX_CHIPS_PER_CELL);
              const extra = chipCards.length - visible.length;
              return (
                <div
                  key={cell.date}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDrawerDate(cell.date)}
                  onKeyDown={(e) => e.key === "Enter" && setDrawerDate(cell.date)}
                  className="h-full min-h-0 p-1 border rounded-sm cursor-pointer flex flex-col"
                  style={{
                    background: cell.inMonth ? "var(--panel)" : "var(--bg)",
                    borderColor: "var(--border)",
                    opacity: cell.inMonth ? 1 : 0.55,
                    outline: cell.isToday ? "2px solid var(--accent)" : undefined,
                  }}
                >
                  <div className="text-[10px] mb-1 font-medium">{cell.date.slice(-2)}</div>
                  <div className="space-y-0.5 relative">
                    {visible.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCardClick(c);
                        }}
                        className="relative z-10 w-full text-left truncate px-1 rounded text-[10px]"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        {c.title}
                      </button>
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerDate(cell.date);
                        }}
                        className="relative z-10 text-[10px] text-[var(--accent)]"
                      >
                        +{extra} 更多
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {segments
              .filter((s) => s.weekIndex === wi)
              .map((s) => (
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
        ))}
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
