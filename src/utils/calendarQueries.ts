import type { Schedule } from "../types/schedule";
import { sortSchedulesForDay } from "./sortSchedules";

export function schedulesForDate(
  schedules: Schedule[],
  dateKey: string,
): Schedule[] {
  return schedules
    .filter((s) => s.date === dateKey)
    .sort(sortSchedulesForDay);
}
