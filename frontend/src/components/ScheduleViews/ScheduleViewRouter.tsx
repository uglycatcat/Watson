import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { AllView } from "./AllView";
import { TrashView } from "./TrashView";
import { todayInTz, DEFAULT_TIMEZONE } from "../calendar/tz";
import type { ScheduleCard } from "../../lib/api";

export type ViewMode = "day" | "week" | "month" | "all" | "trash";

const VIEW_ORDER: ViewMode[] = ["day", "week", "month", "all", "trash"];

const PANE_CLASS: Record<ViewMode, string> = {
  day: "h-full min-h-0 shrink-0 overflow-hidden",
  week: "h-full shrink-0 overflow-auto",
  month: "h-full shrink-0 overflow-auto",
  all: "h-full min-h-0 shrink-0 overflow-hidden",
  trash: "h-full shrink-0 overflow-auto",
};

interface ScheduleViewRouterProps {
  view: ViewMode;
  anchorDate: string;
  onDateChange?: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
  onParentClick?: (card: ScheduleCard) => void;
  onParentIdClick?: (parentId: string) => void;
  onComposeDraft?: (a: ScheduleCard, b: ScheduleCard) => void;
  composeSuccessAnim?: { sourceIds: string[]; targetId: string } | null;
  onCreateClick?: () => void;
  onLeaveTrash?: () => void;
}

/**
 * Horizontal strip + translateX — same slide as the original carousel.
 * Only the active pane (and the pane sliding out) mount their view trees, so
 * hidden views do not keep five card lists in the DOM after the animation.
 */
export function ScheduleViewRouter({
  view,
  anchorDate,
  onDateChange,
  onCardClick,
  onParentClick,
  onParentIdClick,
  onComposeDraft,
  composeSuccessAnim = null,
  onCreateClick,
  onLeaveTrash,
}: ScheduleViewRouterProps) {
  const setDate = onDateChange ?? (() => {});
  const [leaving, setLeaving] = useState<ViewMode | null>(null);
  /** Transform target; lags `view` by a frame so both panes exist before the slide. */
  const [slideView, setSlideView] = useState(view);

  useLayoutEffect(() => {
    if (view === slideView) return;
    setLeaving(slideView);
    const frame = requestAnimationFrame(() => setSlideView(view));
    return () => cancelAnimationFrame(frame);
  }, [view, slideView]);

  useEffect(() => {
    if (leaving == null) return;
    const timer = window.setTimeout(() => setLeaving(null), 240);
    return () => window.clearTimeout(timer);
  }, [leaving, view]);

  const activeIndex = VIEW_ORDER.indexOf(slideView);

  const renderView = (mode: ViewMode): ReactNode => {
    switch (mode) {
      case "day":
        return (
          <DayView
            date={anchorDate}
            onDateChange={setDate}
            onCardClick={onCardClick}
            onParentClick={onParentIdClick}
            onCreateClick={onCreateClick}
          />
        );
      case "week":
        return <WeekView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
      case "month":
        return <MonthView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
      case "all":
        return (
          <AllView
            onCardClick={onCardClick}
            onParentClick={onParentClick}
            onCreateClick={onCreateClick}
            onComposeDraft={onComposeDraft}
            composeSuccessAnim={composeSuccessAnim}
          />
        );
      case "trash":
        return <TrashView onCardClick={onCardClick} onLeaveTrash={onLeaveTrash} />;
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        className="h-full flex"
        style={{
          width: `${VIEW_ORDER.length * 100}%`,
          transform: `translateX(-${activeIndex * (100 / VIEW_ORDER.length)}%)`,
          transitionProperty: "transform",
          transitionDuration: "var(--duration-normal)",
          transitionTimingFunction: "var(--ease-standard)",
        }}
      >
        {VIEW_ORDER.map((mode) => (
          <div
            key={mode}
            className={PANE_CLASS[mode]}
            style={{ width: `${100 / VIEW_ORDER.length}%` }}
          >
            {mode === view || mode === leaving ? renderView(mode) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function todayStr() {
  return todayInTz(DEFAULT_TIMEZONE);
}

export function useTodayStr() {
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  return todayInTz(prefs?.timezone ?? DEFAULT_TIMEZONE);
}
