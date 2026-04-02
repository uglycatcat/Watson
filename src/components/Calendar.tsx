import type { Dayjs } from "dayjs";
import type { Schedule } from "../types/schedule";
import { hasScheduleTime } from "../types/schedule";
import { WATSON_SCHEDULE_DRAG_MIME } from "../constants/dnd";
import { dayjs, formatMonthTitle, getCalendarMatrix, toDateKey } from "../utils/date";
import { sortSchedulesForDay } from "../utils/sortSchedules";

type CalendarProps = {
  cursor: Dayjs;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPickDay: (dateKey: string) => void;
  schedulesByDate: Map<string, Schedule[]>;
  dropHighlightKey: string | null;
  onDropHighlightChange: (key: string | null) => void;
  onDropInboxSchedule: (scheduleId: string, dateKey: string) => void;
  onScheduleDragEnd: () => void;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function priorityBarStyles(p: Schedule["priority"]): string {
  switch (p) {
    case "low":
      return "bg-slate-600/90 text-slate-50 border-slate-500/50";
    case "medium":
      return "bg-amber-600/90 text-amber-50 border-amber-400/45";
    case "high":
      return "bg-rose-600/92 text-rose-50 border-rose-400/45";
  }
}

function ScheduleTaskBar({
  schedule,
  onDragEnd,
}: {
  schedule: Schedule;
  onDragEnd: () => void;
}) {
  const timed = hasScheduleTime(schedule);
  const shape = timed ? "rounded-full" : "rounded-md";
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(WATSON_SCHEDULE_DRAG_MIME, schedule.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      className={`w-full min-w-0 cursor-grab border px-1.5 py-0.5 shadow-sm active:cursor-grabbing ${shape} ${priorityBarStyles(
        schedule.priority,
      )}`}
      title={schedule.title}
    >
      <span className="block min-w-[1ch] max-w-full truncate text-left text-xs font-medium leading-tight tracking-tight">
        {schedule.title.length > 0 ? schedule.title : "·"}
      </span>
    </div>
  );
}

export function Calendar({
  cursor,
  onPrevMonth,
  onNextMonth,
  onPickDay,
  schedulesByDate,
  dropHighlightKey,
  onDropHighlightChange,
  onDropInboxSchedule,
  onScheduleDragEnd,
}: CalendarProps) {
  const matrix = getCalendarMatrix(cursor);
  const todayKey = toDateKey(dayjs());

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-3 pb-28 pt-5 md:px-4">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Watson
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-xl border border-watson-border bg-watson-surface px-3 py-2 text-sm font-medium text-white transition hover:border-slate-500"
            aria-label="上一月"
          >
            ‹
          </button>
          <span className="min-w-[8.5rem] text-center text-lg font-semibold text-white">
            {formatMonthTitle(cursor)}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-xl border border-watson-border bg-watson-surface px-3 py-2 text-sm font-medium text-white transition hover:border-slate-500"
            aria-label="下一月"
          >
            ›
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-watson-border bg-watson-surface/80 shadow-xl shadow-black/20">
        <div className="grid shrink-0 grid-cols-7 border-b border-watson-border bg-watson-bg/50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-watson-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-watson-border">
          {matrix.map((week, wi) => (
            <div
              key={wi}
              className="grid min-h-0 flex-1 grid-cols-7 divide-x divide-watson-border"
            >
              {week.map((cell) => {
                const key = toDateKey(cell);
                const inMonth = cell.month() === cursor.month();
                const isToday = key === todayKey;
                const raw = schedulesByDate.get(key) ?? [];
                const list = [...raw].sort(sortSchedulesForDay);
                const isDropOver = dropHighlightKey === key;

                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onPickDay(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPickDay(key);
                      }
                    }}
                    onDragOver={(e) => {
                      if (![...e.dataTransfer.types].includes(WATSON_SCHEDULE_DRAG_MIME)) {
                        return;
                      }
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      onDropHighlightChange(key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData(WATSON_SCHEDULE_DRAG_MIME);
                      if (id) onDropInboxSchedule(id, key);
                      onScheduleDragEnd();
                    }}
                    className={`flex min-h-0 min-w-0 flex-col p-1 text-left outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-watson-accent md:p-1.5 ${
                      inMonth ? "text-slate-100" : "text-slate-600"
                    } ${
                      isToday
                        ? "bg-blue-500/10 ring-2 ring-inset ring-watson-accent"
                        : ""
                    } ${
                      isDropOver ? "bg-watson-accent/25 ring-2 ring-inset ring-watson-accent/80" : ""
                    }`}
                  >
                    <span
                      className={`mb-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold md:h-7 md:w-7 md:text-sm ${
                        isToday
                          ? "bg-watson-accent text-white"
                          : inMonth
                            ? "text-slate-200"
                            : ""
                      }`}
                    >
                      {cell.date()}
                    </span>
                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
                      {list.map((s) => (
                        <ScheduleTaskBar
                          key={s.id}
                          schedule={s}
                          onDragEnd={onScheduleDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
