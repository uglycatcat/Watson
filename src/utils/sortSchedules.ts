import { hasScheduleTime, type Schedule } from "../types/schedule";

/** 有时间的按开始时间排序；无时间的排在后面，再按标题 */
export function sortSchedulesForDay(a: Schedule, b: Schedule): number {
  const timeA = hasScheduleTime(a);
  const timeB = hasScheduleTime(b);
  if (timeA && !timeB) return -1;
  if (!timeA && timeB) return 1;
  if (timeA && timeB) {
    const c = a.startTime.localeCompare(b.startTime);
    if (c !== 0) return c;
  }
  return a.title.localeCompare(b.title);
}
