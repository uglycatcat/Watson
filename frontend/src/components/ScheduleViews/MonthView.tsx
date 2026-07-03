import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { CardList } from "./CardList";

export function MonthView({ date }: { date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cards", "month", date],
    queryFn: () => api.getCards({ view: "month", date }),
  });
  if (isLoading) return <p>加载中…</p>;
  return (
    <div>
      <h2 className="text-lg font-medium mb-3">月视图</h2>
      <CardList cards={data?.items ?? []} />
    </div>
  );
}
