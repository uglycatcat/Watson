import type { ReactNode } from "react";
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
 * Mount only the active schedule view.
 * Previously all five views stayed mounted (translateX carousel), so every AppShell
 * setState reconciled day+week+month+all+trash card trees — snappy while empty,
 * laggy once cards filled the hidden panes.
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

  let body: ReactNode;
  switch (view) {
    case "day":
      body = (
        <DayView
          date={anchorDate}
          onDateChange={setDate}
          onCardClick={onCardClick}
          onParentClick={onParentIdClick}
          onCreateClick={onCreateClick}
        />
      );
      break;
    case "week":
      body = <WeekView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
      break;
    case "month":
      body = <MonthView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
      break;
    case "all":
      body = (
        <AllView
          onCardClick={onCardClick}
          onParentClick={onParentClick}
          onCreateClick={onCreateClick}
          onComposeDraft={onComposeDraft}
          composeSuccessAnim={composeSuccessAnim}
        />
      );
      break;
    case "trash":
      body = <TrashView onCardClick={onCardClick} onLeaveTrash={onLeaveTrash} />;
      break;
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        key={view}
        className="h-full w-full schedule-view-pane"
      >
        {body}
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
