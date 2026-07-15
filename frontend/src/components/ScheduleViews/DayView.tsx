import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";

interface DayViewProps {
  date: string;
  onCardClick: (card: ScheduleCard) => void;
}

export function DayView({ date, onCardClick }: DayViewProps) {
  const [quadrantOpen, setQuadrantOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "day", date],
    queryFn: () => api.getCards({ view: "day", date }),
  });
  const cards = data?.items ?? [];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h2 className="text-lg font-medium flex-1">日视图 — {date}</h2>
        <button
          type="button"
          onClick={() => setQuadrantOpen(true)}
          className="text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
        >
          坐标视图
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <p>加载中…</p>
        ) : (
          <CardGrid cards={cards} onCardClick={onCardClick} emptyMessage="该日暂无安排" showComplete />
        )}
      </div>
      {quadrantOpen && <QuadrantView cards={cards} onClose={() => setQuadrantOpen(false)} />}
    </div>
  );
}
