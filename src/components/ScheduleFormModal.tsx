import { useEffect, useState } from "react";
import type { Schedule } from "../types/schedule";
import { hasScheduleTime, isInboxSchedule } from "../types/schedule";
import { Modal } from "./Modal";

type FormMode =
  | { kind: "add"; defaultDate: string | null }
  | { kind: "edit"; schedule: Schedule };

type ScheduleFormModalProps = {
  open: boolean;
  mode: FormMode | null;
  onClose: () => void;
  onSave: (schedule: Schedule) => void;
};

export function ScheduleFormModal({
  open,
  mode,
  onClose,
  onSave,
}: ScheduleFormModalProps) {
  const [title, setTitle] = useState("");
  const [noDate, setNoDate] = useState(false);
  const [date, setDate] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<Schedule["priority"]>("medium");

  useEffect(() => {
    if (!open || !mode) return;
    if (mode.kind === "edit") {
      const s = mode.schedule;
      setTitle(s.title);
      const inbox = isInboxSchedule(s);
      setNoDate(inbox);
      setDate(inbox ? "" : s.date);
      const nt = !inbox && !hasScheduleTime(s);
      setNoTime(nt);
      if (nt || inbox) {
        setStartTime("09:00");
        setEndTime("10:00");
      } else {
        setStartTime(s.startTime);
        setEndTime(s.endTime);
      }
      setPriority(s.priority);
    } else {
      setTitle("");
      const d = mode.defaultDate;
      if (d === null) {
        setNoDate(true);
        setDate("");
        setNoTime(true);
        setStartTime("09:00");
        setEndTime("10:00");
      } else {
        setNoDate(false);
        setDate(d);
        setNoTime(false);
        setStartTime("09:00");
        setEndTime("10:00");
      }
      setPriority("medium");
    }
  }, [open, mode]);

  if (!mode) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!noDate && !date) return;
    if (!noDate && !noTime && (!startTime || !endTime)) return;

    let outDate = "";
    let outStart = "";
    let outEnd = "";
    if (noDate) {
      outDate = "";
      outStart = "";
      outEnd = "";
    } else if (noTime) {
      outDate = date;
      outStart = "";
      outEnd = "";
    } else {
      outDate = date;
      outStart = startTime;
      outEnd = endTime;
    }

    const schedule: Schedule = {
      id: mode.kind === "edit" ? mode.schedule.id : crypto.randomUUID(),
      title: trimmed,
      date: outDate,
      startTime: outStart,
      endTime: outEnd,
      priority,
    };
    onSave(schedule);
    onClose();
  };

  const modalTitle = mode.kind === "edit" ? "编辑日程" : "添加日程";
  const showDateFields = !noDate;
  const showTimeFields = showDateFields && !noTime;

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sf-title" className="mb-1 block text-sm text-watson-muted">
            标题
          </label>
          <input
            id="sf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-watson-border bg-watson-bg px-3 py-2 text-white placeholder:text-slate-500 focus:border-watson-accent focus:outline-none focus:ring-1 focus:ring-watson-accent"
            placeholder="要做的事"
            required
            autoFocus
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={noDate}
            onChange={(e) => {
              const v = e.target.checked;
              setNoDate(v);
              if (v) {
                setNoTime(true);
              }
            }}
            className="h-4 w-4 rounded border-watson-border bg-watson-bg text-watson-accent focus:ring-watson-accent"
          />
          未定日期（保存到侧边栏）
        </label>

        {showDateFields && (
          <div>
            <label htmlFor="sf-date" className="mb-1 block text-sm text-watson-muted">
              日期
            </label>
            <input
              id="sf-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-watson-border bg-watson-bg px-3 py-2 text-white focus:border-watson-accent focus:outline-none focus:ring-1 focus:ring-watson-accent"
              required
            />
          </div>
        )}

        {showDateFields && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={noTime}
              onChange={(e) => setNoTime(e.target.checked)}
              className="h-4 w-4 rounded border-watson-border bg-watson-bg text-watson-accent focus:ring-watson-accent"
            />
            无具体时段（仅显示在该日）
          </label>
        )}

        {showTimeFields && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sf-start" className="mb-1 block text-sm text-watson-muted">
                开始
              </label>
              <input
                id="sf-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-watson-border bg-watson-bg px-3 py-2 text-white focus:border-watson-accent focus:outline-none focus:ring-1 focus:ring-watson-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="sf-end" className="mb-1 block text-sm text-watson-muted">
                结束
              </label>
              <input
                id="sf-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-watson-border bg-watson-bg px-3 py-2 text-white focus:border-watson-accent focus:outline-none focus:ring-1 focus:ring-watson-accent"
                required
              />
            </div>
          </div>
        )}

        <div>
          <span className="mb-2 block text-sm text-watson-muted">优先级</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { v: "low" as const, label: "低" },
                { v: "medium" as const, label: "中" },
                { v: "high" as const, label: "高" },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setPriority(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  priority === v
                    ? priorityClassSelected(v)
                    : "border border-watson-border bg-watson-bg text-watson-muted hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-watson-muted transition hover:bg-white/10 hover:text-white"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-xl bg-watson-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
          >
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}

function priorityClassSelected(p: Schedule["priority"]): string {
  switch (p) {
    case "low":
      return "border border-slate-500 bg-slate-600/40 text-slate-100";
    case "medium":
      return "border border-amber-500/60 bg-amber-500/25 text-amber-100";
    case "high":
      return "border border-rose-500/60 bg-rose-500/25 text-rose-100";
  }
}
