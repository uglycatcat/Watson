import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Asia/Shanghai";

export function formatDayInTz(date: Date | string, tz: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

export function todayInTz(tz: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

export function parseDayInTz(day: string, tz: string): Date {
  return fromZonedTime(`${day}T12:00:00`, tz);
}

export function addDayInTz(day: string, delta: number, tz: string): string {
  const d = addDays(parseDayInTz(day, tz), delta);
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

export function monthLabel(day: string, tz: string): string {
  return formatInTimeZone(parseDayInTz(day, tz), tz, "yyyy年M月");
}

export function monthKey(day: string, tz: string): string {
  return formatInTimeZone(parseDayInTz(day, tz), tz, "yyyy-MM");
}

export function weekDayLabel(day: string, tz: string): string {
  return formatInTimeZone(parseDayInTz(day, tz), tz, "M/d EEE");
}

export interface DayCell {
  date: string;
  inMonth: boolean;
  isToday: boolean;
}

export interface WeekRow {
  days: DayCell[];
}

export function buildMonthGrid(anchorDay: string, tz: string, today: string): WeekRow[] {
  const anchor = parseDayInTz(anchorDay, tz);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const anchorMonth = formatInTimeZone(anchor, tz, "yyyy-MM");

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: WeekRow[] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push({
      days: allDays.slice(i, i + 7).map((d) => {
        const date = formatInTimeZone(d, tz, "yyyy-MM-dd");
        return {
          date,
          inMonth: formatInTimeZone(d, tz, "yyyy-MM") === anchorMonth,
          isToday: date === today,
        };
      }),
    });
  }
  return weeks;
}

export function buildWeekDays(anchorDay: string, tz: string, today: string): DayCell[] {
  const anchor = parseDayInTz(anchorDay, tz);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const date = formatInTimeZone(d, tz, "yyyy-MM-dd");
    return { date, inMonth: true, isToday: date === today };
  });
}

export function shiftWeek(anchorDay: string, deltaWeeks: number, tz: string): string {
  return addDayInTz(anchorDay, deltaWeeks * 7, tz);
}
