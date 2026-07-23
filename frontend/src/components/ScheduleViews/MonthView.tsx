import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isParentCard, type ScheduleCard } from "../../lib/api";
import { isOverdueCard } from "../../lib/cardDisplay";
import {
  MAX_CHIPS_PER_CELL,
  allCardsForCell,
  cardsForDay,
  isMultiDay,
} from "../calendar/cardPlacement";
import { buildMonthGrid, DEFAULT_TIMEZONE, monthLabel, todayInTz } from "../calendar/tz";
import { DayScheduleDrawer } from "./DayScheduleDrawer";
import { ViewTimeNav } from "./ViewTimeNav";
import { SkeletonWeekMonth } from "../ui/Skeleton";
import { setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";

interface MonthViewProps {
  date: string;
  onDateChange: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function MonthView({ date, onDateChange, onCardClick }: MonthViewProps) {
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
  const multiDayIds = useMemo(() => new Set(cards.filter((c) => isMultiDay(c, tz)).map((c) => c.id)), [cards, tz]);
  const drawerCards = drawerDate ? cardsForDay(cards, drawerDate, tz) : [];

  return (
    <div className="h-full flex flex-col min-h-0 px-1 pb-8">
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <h2 className="text-lg font-semibold flex-1 view-title">{monthLabel(date, tz)}</h2>
        <ViewTimeNav grain="month" anchorDate={date} onDateChange={onDateChange} timezone={tz} />
      </div>
      {isLoading ? (
        <SkeletonWeekMonth />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-px text-xs mb-1 shrink-0 px-0.5" style={{ color: "var(--muted)" }}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-1 px-0.5 pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-px flex-1 min-h-0">
                {week.days.map((cell) => {
                  const chipCards = allCardsForCell(cards, cell.date, tz);
                  const visible = chipCards.slice(0, MAX_CHIPS_PER_CELL);
                  const extra = chipCards.length - visible.length;
                  return (
                    <div
                      key={cell.date}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDrawerDate(cell.date)}
                      onKeyDown={(e) => e.key === "Enter" && setDrawerDate(cell.date)}
                      className="h-full min-h-0 p-1 border cursor-pointer flex flex-col overflow-hidden transition-interactive"
                      style={{
                        background: cell.inMonth ? "var(--panel)" : "var(--bg)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: cell.inMonth ? "var(--shadow-sm)" : undefined,
                        opacity: cell.inMonth ? 1 : 0.55,
                        outline: cell.isToday ? "2px solid var(--accent)" : undefined,
                      }}
                    >
                      <div className="text-[10px] mb-1 font-medium shrink-0">{cell.date.slice(-2)}</div>
                      <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto">
                        {visible.map((c) => {
                          const multi = multiDayIds.has(c.id);
                          const parent = isParentCard(c);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              draggable
                              onDragStart={(e) => setDragCardId(e.dataTransfer, c.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCardClick(c);
                              }}
                              className={`cal-chip relative z-10 w-full text-left truncate px-1 rounded text-[10px] transition-interactive ${parent ? "parent-chip" : ""} ${isOverdueCard(c) ? "is-overdue" : ""}`}
                              style={{
                                background: isOverdueCard(c)
                                  ? `linear-gradient(to left, var(--overdue-wash), transparent 70%), ${parent ? "var(--accent-subtle)" : "var(--accent)"}`
                                  : parent
                                    ? "var(--accent-subtle)"
                                    : "var(--accent)",
                                color: parent ? "var(--fg)" : "var(--on-accent)",
                                paddingTop: multi ? 3 : 2,
                                paddingBottom: multi ? 3 : 2,
                                marginLeft: multi ? -2 : 0,
                                marginRight: multi ? -2 : 0,
                                width: multi ? "calc(100% + 4px)" : "100%",
                                cursor: "grab",
                                borderRadius: "var(--radius-sm)",
                                border: parent ? "1px solid var(--border)" : undefined,
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
                        })}
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
              </div>
            ))}
          </div>
        </>
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
