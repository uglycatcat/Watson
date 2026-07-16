import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";
import { ViewTimeNav } from "./ViewTimeNav";
import { DEFAULT_TIMEZONE } from "../calendar/tz";

interface DayViewProps {
  date: string;
  onDateChange: (d: string) => void;
  onCardClick: (card: ScheduleCard) => void;
}

export function DayView({ date, onDateChange, onCardClick }: DayViewProps) {
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: api.getPreferences });
  const tz = prefs?.timezone ?? DEFAULT_TIMEZONE;
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "day", date],
    queryFn: () => api.getCards({ view: "day", date }),
  });
  const cards = data?.items ?? [];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <h2 className="text-lg font-medium flex-1 min-w-[8rem]">日视图 — {date}</h2>
        <ViewTimeNav grain="day" anchorDate={date} onDateChange={onDateChange} timezone={tz} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
        <div className="flex-1 min-w-0 min-h-0 overflow-auto">
          {isLoading ? (
            <p>加载中…</p>
          ) : (
            <CardGrid
              cards={cards}
              onCardClick={onCardClick}
              emptyMessage="该日暂无安排"
              showComplete
              draggableCards
            />
          )}
        </div>
        <div
          className="shrink-0 w-full md:w-[min(320px,40%)] min-h-[200px] aspect-square max-h-[min(100%,420px)] rounded-xl overflow-hidden"
          style={{
            background: "var(--bg)",
            boxShadow: "inset 0 2px 8px color-mix(in srgb, var(--fg) 12%, transparent)",
            border: "1px solid var(--border)",
          }}
        >
          <QuadrantView cards={cards} variant="embedded" />
        </div>
      </div>
    </div>
  );
}
