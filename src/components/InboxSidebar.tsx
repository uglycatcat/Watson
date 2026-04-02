import { WATSON_SCHEDULE_DRAG_MIME } from "../constants/dnd";
import type { Schedule } from "../types/schedule";
import { hasScheduleTime } from "../types/schedule";

type InboxSidebarProps = {
  tasks: Schedule[];
  dropHighlight: boolean;
  onAddClick: () => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onDragEnd: () => void;
  onDropScheduleToInbox: (scheduleId: string) => void;
  onInboxAsDropTargetEnter: () => void;
};

function priorityDot(p: Schedule["priority"]): string {
  switch (p) {
    case "low":
      return "bg-slate-400";
    case "medium":
      return "bg-amber-400";
    case "high":
      return "bg-rose-400";
  }
}

export function InboxSidebar({
  tasks,
  dropHighlight,
  onAddClick,
  onEdit,
  onDelete,
  onDragEnd,
  onDropScheduleToInbox,
  onInboxAsDropTargetEnter,
}: InboxSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-watson-border bg-watson-surface/90">
      <div className="shrink-0 border-b border-watson-border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-watson-muted">
          未定日期
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          拖到日历格可安排到某日；日历中的日程可拖回此处，变为未定日期且无时段
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-3 w-full rounded-xl border border-dashed border-watson-border py-2 text-sm font-medium text-watson-accent transition hover:border-watson-accent hover:bg-watson-accent/10"
        >
          + 添加未定日期任务
        </button>
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col transition-colors ${
          dropHighlight
            ? "bg-watson-accent/15 ring-2 ring-inset ring-watson-accent/70"
            : ""
        }`}
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes(WATSON_SCHEDULE_DRAG_MIME)) {
            return;
          }
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onInboxAsDropTargetEnter();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData(WATSON_SCHEDULE_DRAG_MIME);
          if (id) onDropScheduleToInbox(id);
          onDragEnd();
        }}
      >
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {tasks.length === 0 ? (
            <li className="py-8 text-center text-sm text-watson-muted">
              {dropHighlight ? "松开即可放入收件箱" : "暂无任务"}
            </li>
          ) : (
            tasks.map((s) => (
              <li
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(WATSON_SCHEDULE_DRAG_MIME, s.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={onDragEnd}
                className="group cursor-grab rounded-xl border border-watson-border bg-watson-bg/80 p-3 active:cursor-grabbing"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot(s.priority)}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="w-full text-left"
                    >
                      <div className="font-medium text-white">{s.title}</div>
                      <div className="mt-0.5 text-xs text-watson-muted">
                        {hasScheduleTime(s)
                          ? `${s.startTime} – ${s.endTime}`
                          : "未设定时间"}
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-rose-300 opacity-0 transition hover:bg-rose-500/20 group-hover:opacity-100"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
