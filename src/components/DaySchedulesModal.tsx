import type { Schedule } from "../types/schedule";
import { hasScheduleTime } from "../types/schedule";
import { Modal } from "./Modal";

type DaySchedulesModalProps = {
  open: boolean;
  dateLabel: string;
  schedules: Schedule[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
};

function priorityStyles(p: Schedule["priority"]): string {
  switch (p) {
    case "low":
      return "border-l-slate-400 bg-slate-500/15";
    case "medium":
      return "border-l-amber-400 bg-amber-500/15";
    case "high":
      return "border-l-rose-400 bg-rose-500/15";
  }
}

function priorityLabel(p: Schedule["priority"]): string {
  switch (p) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
  }
}

function timeLine(s: Schedule): string {
  if (!hasScheduleTime(s)) return "无具体时段";
  return `${s.startTime} – ${s.endTime}`;
}

export function DaySchedulesModal({
  open,
  dateLabel,
  schedules,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: DaySchedulesModalProps) {
  return (
    <Modal open={open} title={dateLabel} onClose={onClose}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl border border-dashed border-watson-border py-2.5 text-sm font-medium text-watson-accent transition hover:border-watson-accent hover:bg-watson-accent/10"
        >
          + 为此日添加日程
        </button>
        {schedules.length === 0 ? (
          <p className="py-6 text-center text-sm text-watson-muted">这一天还没有日程</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {schedules.map((s) => (
              <li
                key={s.id}
                className={`flex items-start gap-3 rounded-xl border border-watson-border border-l-4 p-3 ${priorityStyles(
                  s.priority,
                )}`}
              >
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="font-medium text-white">{s.title}</div>
                  <div className="mt-0.5 text-xs text-watson-muted">
                    {timeLine(s)}
                    <span className="ml-2 rounded bg-black/20 px-1.5 py-0.5">
                      {priorityLabel(s.priority)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
