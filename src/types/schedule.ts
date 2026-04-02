export type Schedule = {
  id: string;
  title: string;
  /** 空字符串表示未定日期，显示在侧边栏 */
  date: string;
  /** 与 endTime 同时非空表示有具体时段；否则为「仅有日期」 */
  startTime: string;
  endTime: string;
  priority: "low" | "medium" | "high";
};

export function isInboxSchedule(s: Schedule): boolean {
  return !s.date;
}

export function hasScheduleTime(s: Schedule): boolean {
  return Boolean(s.startTime && s.endTime);
}
