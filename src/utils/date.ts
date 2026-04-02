import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);
dayjs.locale("zh-cn");

export { dayjs };

export function formatMonthTitle(d: dayjs.Dayjs): string {
  return d.format("YYYY年 M月");
}

export function toDateKey(d: dayjs.Dayjs): string {
  return d.format("YYYY-MM-DD");
}

export function parseDateKey(key: string): dayjs.Dayjs {
  return dayjs(key);
}

/** ISO week: Monday-first grid for the month containing `cursor`. */
export function getCalendarMatrix(cursor: dayjs.Dayjs): dayjs.Dayjs[][] {
  const startOfMonth = cursor.startOf("month");
  const endOfMonth = cursor.endOf("month");
  let gridStart = startOfMonth.startOf("isoWeek");
  const end = endOfMonth.endOf("isoWeek");
  const weeks: dayjs.Dayjs[][] = [];
  let current = gridStart;
  while (current.isBefore(end) || current.isSame(end, "day")) {
    const row: dayjs.Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(current);
      current = current.add(1, "day");
    }
    weeks.push(row);
  }
  return weeks;
}
