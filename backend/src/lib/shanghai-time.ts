/**
 * Asia/Shanghai calendar-day helpers for schedule range filtering.
 *
 * Watson only deploys in Shanghai. Boundaries are built with an explicit
 * `+08:00` offset so Node processes running with TZ=UTC (common in containers)
 * still treat "today 01:00" as belonging to the Shanghai calendar day.
 *
 * Do not use bare `new Date("YYYY-MM-DD")` or `new Date("...T00:00:00")` —
 * those follow UTC / process-local rules and shift early-morning Shanghai times.
 */

export const APP_TIMEZONE = "Asia/Shanghai";
/** Fixed offset — Shanghai has no DST. */
export const APP_TZ_OFFSET = "+08:00";

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertCalendarDate(dateStr: string): { y: number; m: number; d: number } {
  const match = YMD_RE.exec(dateStr);
  if (!match) {
    throw Object.assign(new Error(`Invalid calendar date: ${dateStr}`), { statusCode: 400 });
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw Object.assign(new Error(`Invalid calendar date: ${dateStr}`), { statusCode: 400 });
  }
  return { y, m, d };
}

export function formatYmd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Instant for local Shanghai wall time on a calendar day. */
export function shanghaiWallTime(dateStr: string, time: string): Date {
  assertCalendarDate(dateStr);
  return new Date(`${dateStr}T${time}${APP_TZ_OFFSET}`);
}

export function dayStartShanghai(dateStr: string): Date {
  return shanghaiWallTime(dateStr, "00:00:00.000");
}

export function dayEndShanghai(dateStr: string): Date {
  return shanghaiWallTime(dateStr, "23:59:59.999");
}

export function dayBoundsShanghai(dateStr: string): { start: Date; end: Date } {
  return { start: dayStartShanghai(dateStr), end: dayEndShanghai(dateStr) };
}

/** Add whole calendar days in the Shanghai date grid (not duration-based). */
export function addCalendarDays(dateStr: string, delta: number): string {
  const { y, m, d } = assertCalendarDate(dateStr);
  const probe = new Date(Date.UTC(y, m - 1, d + delta));
  return formatYmd(probe.getUTCFullYear(), probe.getUTCMonth() + 1, probe.getUTCDate());
}

/** Monday=0 … Sunday=6 for a Shanghai calendar date. */
export function mondayBasedWeekday(dateStr: string): number {
  const { y, m, d } = assertCalendarDate(dateStr);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

export function todayYmdShanghai(now: Date = new Date()): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Inclusive day/week/month windows in absolute UTC instants, aligned to
 * Asia/Shanghai calendar days (week starts Monday).
 */
export function rangeForViewShanghai(
  view: "day" | "week" | "month",
  dateStr: string,
): { start: Date; end: Date } {
  assertCalendarDate(dateStr);

  if (view === "day") {
    return dayBoundsShanghai(dateStr);
  }

  if (view === "week") {
    const monday = addCalendarDays(dateStr, -mondayBasedWeekday(dateStr));
    const sunday = addCalendarDays(monday, 6);
    return { start: dayStartShanghai(monday), end: dayEndShanghai(sunday) };
  }

  const { y, m } = assertCalendarDate(dateStr);
  const first = formatYmd(y, m, 1);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = formatYmd(y, m, lastDay);
  return { start: dayStartShanghai(first), end: dayEndShanghai(last) };
}

/** End of the Shanghai calendar day that is `days` after today (inclusive window). */
export function dueSoonWindowEndShanghai(days: number, now: Date = new Date()): Date {
  const endDay = addCalendarDays(todayYmdShanghai(now), Math.max(0, days));
  return dayEndShanghai(endDay);
}
