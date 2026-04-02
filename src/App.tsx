import { useEffect, useMemo, useState } from "react";
import { Calendar } from "./components/Calendar";
import { DaySchedulesModal } from "./components/DaySchedulesModal";
import { Fab } from "./components/Fab";
import { InboxSidebar } from "./components/InboxSidebar";
import { ScheduleFormModal } from "./components/ScheduleFormModal";
import { SettingsDock } from "./components/SettingsDock";
import { useScheduleStore } from "./store/useScheduleStore";
import type { Schedule } from "./types/schedule";
import { isInboxSchedule } from "./types/schedule";
import { schedulesForDate } from "./utils/calendarQueries";
import { dayjs, parseDateKey, toDateKey } from "./utils/date";
import { bootstrapSchedules } from "./utils/schedulePersistence";

type FormMode =
  | { kind: "add"; defaultDate: string | null }
  | { kind: "edit"; schedule: Schedule };

export default function App() {
  const schedules = useScheduleStore((s) => s.schedules);
  const addSchedule = useScheduleStore((s) => s.addSchedule);
  const updateSchedule = useScheduleStore((s) => s.updateSchedule);
  const removeSchedule = useScheduleStore((s) => s.removeSchedule);

  const [bootReady, setBootReady] = useState(false);
  const [jsonFromServer, setJsonFromServer] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await bootstrapSchedules();
      if (!alive) return;
      useScheduleStore.setState({ schedules: r.schedules });
      setJsonFromServer(r.jsonFromServer);
      setBootReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const [cursor, setCursor] = useState(() => dayjs());
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [lastPickedDate, setLastPickedDate] = useState<string>(() =>
    toDateKey(dayjs()),
  );
  const [dropHighlightKey, setDropHighlightKey] = useState<string | null>(null);
  const [inboxDropActive, setInboxDropActive] = useState(false);

  const inboxTasks = useMemo(
    () =>
      schedules
        .filter(isInboxSchedule)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [schedules],
  );

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of schedules) {
      if (!s.date) continue;
      const list = map.get(s.date);
      if (list) list.push(s);
      else map.set(s.date, [s]);
    }
    return map;
  }, [schedules]);

  const dayList = dayModalDate
    ? schedulesForDate(schedules, dayModalDate)
    : [];

  const dayModalLabel = dayModalDate
    ? parseDateKey(dayModalDate).format("YYYY年 M月 D日 (ddd)")
    : "";

  const openAddForm = (defaultDate: string | null) => {
    setFormMode({ kind: "add", defaultDate });
  };

  const clearDragUi = () => {
    setDropHighlightKey(null);
    setInboxDropActive(false);
  };

  const handleCalendarDropHighlight = (key: string | null) => {
    setDropHighlightKey(key);
    if (key !== null) setInboxDropActive(false);
  };

  if (!bootReady) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-watson-bg text-watson-muted">
        正在加载日程数据…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <InboxSidebar
        tasks={inboxTasks}
        dropHighlight={inboxDropActive}
        onAddClick={() => openAddForm(null)}
        onEdit={(s) => setFormMode({ kind: "edit", schedule: s })}
        onDelete={(id) => removeSchedule(id)}
        onDragEnd={clearDragUi}
        onDropScheduleToInbox={(scheduleId) => {
          const s = schedules.find((x) => x.id === scheduleId);
          if (!s || isInboxSchedule(s)) return;
          updateSchedule({ ...s, date: "", startTime: "", endTime: "" });
        }}
        onInboxAsDropTargetEnter={() => {
          setDropHighlightKey(null);
          setInboxDropActive(true);
        }}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Calendar
          cursor={cursor}
          onPrevMonth={() => setCursor((c) => c.subtract(1, "month"))}
          onNextMonth={() => setCursor((c) => c.add(1, "month"))}
          onPickDay={(key) => {
            setLastPickedDate(key);
            setDayModalDate(key);
          }}
          schedulesByDate={schedulesByDate}
          dropHighlightKey={dropHighlightKey}
          onDropHighlightChange={handleCalendarDropHighlight}
          onDropInboxSchedule={(scheduleId, dateKey) => {
            const s = schedules.find((x) => x.id === scheduleId);
            if (!s || !isInboxSchedule(s)) return;
            updateSchedule({
              ...s,
              date: dateKey,
              startTime: "",
              endTime: "",
            });
          }}
          onScheduleDragEnd={clearDragUi}
        />
      </main>
      <Fab onClick={() => openAddForm(lastPickedDate)} />
      <SettingsDock schedules={schedules} jsonFromServer={jsonFromServer} />

      <DaySchedulesModal
        open={dayModalDate !== null}
        dateLabel={dayModalLabel}
        schedules={dayList}
        onClose={() => setDayModalDate(null)}
        onAdd={() => {
          if (dayModalDate) {
            const d = dayModalDate;
            setDayModalDate(null);
            openAddForm(d);
          }
        }}
        onEdit={(s) => {
          setDayModalDate(null);
          setFormMode({ kind: "edit", schedule: s });
        }}
        onDelete={(id) => removeSchedule(id)}
      />

      <ScheduleFormModal
        open={formMode !== null}
        mode={formMode}
        onClose={() => setFormMode(null)}
        onSave={(schedule) => {
          const exists = schedules.some((s) => s.id === schedule.id);
          if (exists) updateSchedule(schedule);
          else addSchedule(schedule);
        }}
      />
    </div>
  );
}
