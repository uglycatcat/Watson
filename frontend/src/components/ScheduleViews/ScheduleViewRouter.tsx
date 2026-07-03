import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { AllView } from "./AllView";
import { format } from "date-fns";

export type ViewMode = "day" | "week" | "month" | "all";

export function ScheduleViewRouter({ view, anchorDate }: { view: ViewMode; anchorDate: string }) {
  if (view === "day") return <DayView date={anchorDate} />;
  if (view === "week") return <WeekView date={anchorDate} />;
  if (view === "month") return <MonthView date={anchorDate} />;
  return <AllView />;
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}
