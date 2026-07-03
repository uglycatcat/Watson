import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type PriorityLevel } from "../../lib/api";
import { CardList } from "./CardList";

export function AllView() {
  const [importance, setImportance] = useState<PriorityLevel | "">("");
  const [sort, setSort] = useState<"time" | "priority">("time");

  const params: Record<string, string> = { view: "all", sort };
  if (importance) params.importance = importance;

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "all", params],
    queryFn: () => api.getCards(params),
  });

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">全部视图</h2>
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <select
          value={importance}
          onChange={(e) => setImportance(e.target.value as PriorityLevel | "")}
          className="px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
        >
          <option value="">全部重要度</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "time" | "priority")}
          className="px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" }}
        >
          <option value="time">按时间</option>
          <option value="priority">按优先级</option>
        </select>
      </div>
      {isLoading ? <p>加载中…</p> : <CardList cards={data?.items ?? []} />}
    </div>
  );
}
