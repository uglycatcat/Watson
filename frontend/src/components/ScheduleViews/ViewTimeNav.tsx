import { addMonths } from "date-fns";
import { addDayInTz, formatDayInTz, parseDayInTz, shiftWeek, todayInTz } from "../calendar/tz";

export type TimeNavGrain = "day" | "week" | "month";

interface ViewTimeNavProps {
  grain: TimeNavGrain;
  anchorDate: string;
  onDateChange: (d: string) => void;
  timezone: string;
}

const LABELS: Record<TimeNavGrain, { prev: string; current: string; next: string }> = {
  day: { prev: "前一天", current: "今天", next: "后一天" },
  week: { prev: "上一周", current: "本周", next: "下一周" },
  month: { prev: "上一月", current: "本月", next: "下一月" },
};

const BTN_CLASS = "text-sm px-2 py-1 border transition-interactive nav-time-btn";
const BTN_STYLE = {
  borderColor: "var(--border)",
  borderRadius: "var(--radius-md)",
} as const;

function shiftMonth(anchorDay: string, deltaMonths: number, tz: string): string {
  const d = addMonths(parseDayInTz(anchorDay, tz), deltaMonths);
  return formatDayInTz(d, tz);
}

export function ViewTimeNav({ grain, anchorDate, onDateChange, timezone }: ViewTimeNavProps) {
  const today = todayInTz(timezone);
  const labels = LABELS[grain];

  const goPrev = () => {
    if (grain === "day") onDateChange(addDayInTz(anchorDate, -1, timezone));
    else if (grain === "week") onDateChange(shiftWeek(anchorDate, -1, timezone));
    else onDateChange(shiftMonth(anchorDate, -1, timezone));
  };

  const goCurrent = () => onDateChange(today);

  const goNext = () => {
    if (grain === "day") onDateChange(addDayInTz(anchorDate, 1, timezone));
    else if (grain === "week") onDateChange(shiftWeek(anchorDate, 1, timezone));
    else onDateChange(shiftMonth(anchorDate, 1, timezone));
  };

  return (
    <div
      className="flex items-center gap-2 shrink-0 py-1 -my-1 overflow-visible relative z-10"
      style={{ transform: "translateY(20%)" }}
    >
      <button type="button" className={BTN_CLASS} style={BTN_STYLE} onClick={goPrev}>
        {labels.prev}
      </button>
      <button type="button" className={BTN_CLASS} style={BTN_STYLE} onClick={goCurrent}>
        {labels.current}
      </button>
      <button type="button" className={BTN_CLASS} style={BTN_STYLE} onClick={goNext}>
        {labels.next}
      </button>
    </div>
  );
}
