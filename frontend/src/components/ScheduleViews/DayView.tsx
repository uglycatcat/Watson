import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { CardList } from "./CardList";

export function DayView({ date }: { date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "day", date],
    queryFn: () => api.getCards({ view: "day", date }),
  });
  if (isLoading) return <p>加载中…</p>;
  return (
    <div>
      <h2 className="text-lg font-medium mb-3">日视图 — {date}</h2>
      <CardList cards={data?.items ?? []} />
    </div>
  );
}
