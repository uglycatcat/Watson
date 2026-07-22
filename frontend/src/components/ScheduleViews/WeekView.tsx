import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isParentCard, type ScheduleCard } from "../../lib/api";
import { isOverdueCard } from "../../lib/cardDisplay";
import {
  MAX_CHIPS_PER_CELL,
  buildSpanSegments,
  cardsForDay,
  isMultiDay,
  singleDayCardsForCell,
} from "../calendar/cardPlacement";
import { LANE_HEIGHT, SpanBar } from "../calendar/SpanBar";
import { buildWeekDays, DEFAULT_TIMEZONE, todayInTz, weekDayLabel } from "../calendar/weekGrid";
import { DayScheduleDrawer } from "./DayScheduleDrawer";
import { ViewTimeNav } from "./ViewTimeNav";
import { SkeletonWeekMonth } from "../ui/Skeleton";
import { setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";

interface WeekViewProps {
  date: string;
  onDateChange: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
}

const DAY_HEADER_OFFSET = 40;

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

  const maxLane = segments.reduce((m, s) => Math.max(m, s.lane), -1);
  const spanBand = maxLane >= 0 ? (maxLane + 1) * LANE_HEIGHT + 4 : 0;

  return (
    <div className="h-full flex flex-col min-h-0 px-1 pb-8">
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <h2 className="text-lg font-semibold flex-1">周视图</h2>
        <ViewTimeNav grain="week" anchorDate={date} onDateChange={onDateChange} timezone={tz} />
      </div>
      {isLoading ? (
        <SkeletonWeekMonth />
      ) : (
        <div className="relative flex-1 min-h-0 grid grid-cols-7 gap-1.5 px-0.5 pt-3 pb-2 overflow-hidden">
          {days.map((cell) => {
            const chipCards = singleDayCardsForCell(cards, cell.date, tz, multiDayIds);
            const visible = chipCards.slice(0, MAX_CHIPS_PER_CELL);
            const extra = chipCards.length - visible.length;
            const hasSpan = segments.some((s) => cardDayInSegment(s, cell.date, days));
            return (
              <div
                key={cell.date}
                className="min-h-0 h-full border flex flex-col overflow-hidden"
                style={{
                  background: "var(--panel)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-sm)",
                  outline: cell.isToday ? "2px solid var(--accent)" : undefined,
                  padding: "var(--space-3) var(--space-2)",
                }}
              >
                <div className="text-sm font-semibold mb-2.5 shrink-0 leading-5">{weekDayLabel(cell.date, tz)}</div>
                <div className="space-y-1 flex-1 min-h-0 overflow-y-auto" style={{ paddingTop: spanBand }}>
                  {visible.length === 0 && !hasSpan ? (
                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                      无安排
                    </p>
                  ) : (
                    visible.map((c) => {
                      const parent = isParentCard(c);
                      const overdue = isOverdueCard(c);
                      return (
                      <button
                        key={c.id}
                        type="button"
                        draggable
                        onDragStart={(e) => setDragCardId(e.dataTransfer, c.id)}
                        onClick={() => onCardClick(c)}
                        className={`relative z-10 w-full text-left truncate px-1 py-0.5 rounded text-[10px] transition-interactive ${parent ? "parent-card-stack parent-chip" : ""} ${overdue ? "is-overdue" : ""}`}
                        style={{
                          background: overdue ? "var(--overdue-bg)" : parent ? "var(--accent-subtle)" : "var(--accent)",
                          color: overdue || parent ? "var(--fg)" : "#fff",
                          cursor: "grab",
                          borderRadius: "var(--radius-sm)",
                          border: parent || overdue ? "1px solid var(--border)" : undefined,
                        }}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="truncate pr-1">{c.title}</span>
                          {parent ? (
                            <span className="parent-child-badge parent-child-badge--inline" aria-label={`${c.childCount ?? 0} 张子卡片`}>
                              {c.childCount ?? 0}
                            </span>
                          ) : (
                            <StageBadge stage={c.stage} compact />
                          )}
                        </span>
                      </button>
                      );
                    })
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
          {segments.map((s) => (
            <SpanBar
              key={`${s.card.id}-${s.startCol}-${s.endCol}`}
              card={s.card}
              startCol={s.startCol}
              endCol={s.endCol}
              lane={s.lane}
              topOffset={DAY_HEADER_OFFSET + 16}
              onClick={onCardClick}
            />
          ))}
        </div>
      )}
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
): boolean {
  const col = days.findIndex((d) => d.date === date);
  return col >= s.startCol && col <= s.endCol;
}
