import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";
import { ViewTimeNav } from "./ViewTimeNav";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCardGrid } from "../ui/Skeleton";
import { DEFAULT_TIMEZONE } from "../calendar/tz";
import { buildDaySections } from "../calendar/daySections";
import { DailyReportPanel } from "../daily-report/DailyReportPanel";

interface DayViewProps {
  date: string;
  onDateChange: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
  onCreateClick?: () => void;
}

export function DayView({ date, onDateChange, onCardClick, onCreateClick }: DayViewProps) {
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  const tz = prefs?.timezone ?? DEFAULT_TIMEZONE;
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "day", date],
    queryFn: () => api.getCards({ view: "day", date }),
  });
  const cards = data?.items ?? [];
  const sections = useMemo(() => buildDaySections(cards, date, tz), [cards, date, tz]);
  const [highlightedCardIds, setHighlightedCardIds] = useState<ReadonlySet<string>>(new Set());
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateScrollEdges = () => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollEdges({
      top: element.scrollTop > 2,
      bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 2,
    });
  };
  const daySections = [
    ["今天截止", sections.dueToday, "截止时间落在今天"],
    ["正在进行", sections.inProgress, "跨越今天的日程"],
    ["今天开始", sections.startingToday, "开始时间落在今天"],
  ] as const;
  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollEdges);
    return () => cancelAnimationFrame(frame);
  }, [cards.length, date]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <h2 className="text-lg font-semibold flex-1 min-w-[8rem]">日视图 — {date}</h2>
        <ViewTimeNav grain="day" anchorDate={date} onDateChange={onDateChange} timezone={tz} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 items-stretch overflow-auto md:overflow-hidden">
        <div className="flex-none md:flex-1 min-w-0 min-h-[560px] md:min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="relative flex-1 min-h-0">
            <div ref={scrollRef} onScroll={updateScrollEdges} className="day-sections h-full min-h-0 overflow-auto">
              {isLoading ? (
                <SkeletonCardGrid />
              ) : cards.length === 0 ? (
                <EmptyState icon="📅" title="这一天没有日程" description="日报仍可在下方记录" action={onCreateClick ? { label: "新建日程", onClick: onCreateClick } : undefined} compact />
              ) : (
                daySections.map(([title, sectionCards, description]) => (
                  <section className="day-section" key={title}>
                    <div className="day-section-heading"><h3>{title}</h3><span>{description} · {sectionCards.length}</span></div>
                    {sectionCards.length ? (
                      <CardGrid cards={sectionCards} onCardClick={onCardClick} showComplete draggableCards sortMode="preserve" showHoverBar highlightedCardIds={highlightedCardIds} />
                    ) : <p className="day-section-empty">本章节暂无日程</p>}
                  </section>
                ))
              )}
            </div>
            <span className={`scroll-fade scroll-fade-top ${scrollEdges.top ? "is-visible" : ""}`} />
            <span className={`scroll-fade scroll-fade-bottom ${scrollEdges.bottom ? "is-visible" : ""}`} />
          </div>
          <div className="shrink-0"><DailyReportPanel date={date} /></div>
        </div>
        <div
          className="shrink-0 rounded-xl overflow-hidden w-full max-w-[min(100%,66.666%)] mx-auto aspect-square md:mx-0 md:w-auto md:h-2/3 md:max-w-[min(100%,33.333%)] md:aspect-square md:self-center"
          style={{
            background: "var(--bg)",
            boxShadow: "inset 0 2px 8px color-mix(in srgb, var(--fg) 12%, transparent)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <QuadrantView cards={cards} variant="embedded" onHoverCardIds={setHighlightedCardIds} />
        </div>
      </div>
    </div>
  );
}
