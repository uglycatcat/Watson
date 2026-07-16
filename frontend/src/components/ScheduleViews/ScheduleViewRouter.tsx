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
}

export function ScheduleViewRouter({ view, anchorDate, onDateChange, onCardClick }: ScheduleViewRouterProps) {
  const setDate = onDateChange ?? (() => {});
  if (view === "trash") return <TrashView onCardClick={onCardClick} />;
  if (view === "day") return <DayView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
  if (view === "week") return <WeekView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
  if (view === "month") return <MonthView date={anchorDate} onDateChange={setDate} onCardClick={onCardClick} />;
  return <AllView onCardClick={onCardClick} />;
}

export function todayStr() {
  return todayInTz(DEFAULT_TIMEZONE);
}

export function useTodayStr() {
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  return todayInTz(prefs?.timezone ?? DEFAULT_TIMEZONE);
}
