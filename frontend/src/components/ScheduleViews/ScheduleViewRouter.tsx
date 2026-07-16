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

interface ScheduleViewRouterProps {
  view: ViewMode;
  anchorDate: string;
  onDateChange?: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
  onCreateClick?: () => void;
  onLeaveTrash?: () => void;
}

export function ScheduleViewRouter({
  view,
  anchorDate,
  onDateChange,
  onCardClick,
  onCreateClick,
  onLeaveTrash,
}: ScheduleViewRouterProps) {
  const setDate = onDateChange ?? (() => {});
  const activeIndex = VIEW_ORDER.indexOf(view);

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        className="h-full flex transition-transform"
        style={{
          width: `${VIEW_ORDER.length * 100}%`,
          transform: `translateX(-${activeIndex * (100 / VIEW_ORDER.length)}%)`,
          transitionDuration: "var(--duration-normal)",
          transitionTimingFunction: "var(--ease-standard)",
        }}
      >
        <div className="h-full shrink-0 overflow-auto" style={{ width: `${100 / VIEW_ORDER.length}%` }}>
          <DayView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} onCreateClick={onCreateClick} />
        </div>
        <div className="h-full shrink-0 overflow-auto" style={{ width: `${100 / VIEW_ORDER.length}%` }}>
          <WeekView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />
        </div>
        <div className="h-full shrink-0 overflow-auto" style={{ width: `${100 / VIEW_ORDER.length}%` }}>
          <MonthView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />
        </div>
        <div className="h-full shrink-0 overflow-auto" style={{ width: `${100 / VIEW_ORDER.length}%` }}>
          <AllView onCardClick={onCardClick} onCreateClick={onCreateClick} />
        </div>
        <div className="h-full shrink-0 overflow-auto" style={{ width: `${100 / VIEW_ORDER.length}%` }}>
          <TrashView onCardClick={onCardClick} onLeaveTrash={onLeaveTrash} />
        </div>
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
