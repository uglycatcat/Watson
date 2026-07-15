import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";

interface AllViewProps {
  onCardClick: (card: ScheduleCard) => void;
}

export function AllView({ onCardClick }: AllViewProps) {
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState("");
  const [urgency, setUrgency] = useState("");
  const [scheduled, setScheduled] = useState<"" | "true" | "false">("");
  const [quadrantOpen, setQuadrantOpen] = useState(false);

  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  const params: Record<string, string> = { view: "all" };
  if (categoryId) params.categoryId = categoryId;
  if (importance !== "") params.importance = importance;
  if (urgency !== "") params.urgency = urgency;
  if (scheduled) params.scheduled = scheduled;

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "all", params],
    queryFn: () => api.getCards(params),
  });

  const cards = data?.items ?? [];
  const selectClass = "px-2 py-1 rounded border text-sm";
  const selectStyle = { borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" };

  const priorityOptions = Array.from({ length: 11 }, (_, i) => (
    <option key={i} value={String(i)}>
      {i}
    </option>
  ));

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h2 className="text-lg font-medium flex-1">全部视图</h2>
        <button
          type="button"
          onClick={() => setQuadrantOpen(true)}
          className="text-sm px-2 py-1 rounded border"
          style={{ borderColor: "var(--border)" }}
        >
          坐标视图
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 text-sm shrink-0">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="">全部分类</option>
          {(catData?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={importance} onChange={(e) => setImportance(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="">全部重要度</option>
          {priorityOptions}
        </select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="">全部紧急度</option>
          {priorityOptions}
        </select>
        <select value={scheduled} onChange={(e) => setScheduled(e.target.value as "" | "true" | "false")} className={selectClass} style={selectStyle}>
          <option value="">全部安排</option>
          <option value="true">已安排</option>
          <option value="false">未安排</option>
        </select>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <p>加载中…</p>
        ) : (
          <CardGrid cards={cards} onCardClick={onCardClick} emptyMessage="暂无日程" showComplete />
        )}
      </div>
      {quadrantOpen && <QuadrantView cards={cards} onClose={() => setQuadrantOpen(false)} />}
    </div>
  );
}
