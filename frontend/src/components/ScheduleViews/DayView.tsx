import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { CardGrid } from "./CardGrid";

interface DayViewProps {
  date: string;
  onCardClick: (card: ScheduleCard) => void;
}

export function DayView({ date, onCardClick }: DayViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "day", date],
    queryFn: () => api.getCards({ view: "day", date }),
  });
  if (isLoading) return <p>加载中…</p>;
  const cards = data?.items ?? [];
  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-lg font-medium mb-3 shrink-0">日视图 — {date}</h2>
      <div className="flex-1 min-h-0 overflow-auto">
        <CardGrid cards={cards} onCardClick={onCardClick} emptyMessage="该日暂无安排" />
      </div>
    </div>
  );
}
