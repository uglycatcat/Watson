import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type PriorityLevel, type ScheduleCard, type TimeNature, type CardSort } from "../../lib/api";
import { CardGrid } from "./CardGrid";

interface AllViewProps {
  onCardClick: (card: ScheduleCard) => void;
}

export function AllView({ onCardClick }: AllViewProps) {
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState<PriorityLevel | "">("");
  const [urgency, setUrgency] = useState<PriorityLevel | "">("");
  const [timeNature, setTimeNature] = useState<TimeNature | "">("");
  const [hasTime, setHasTime] = useState<"" | "true" | "false">("");
  const [sort, setSort] = useState<CardSort>("time");

  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  const params: Record<string, string> = { view: "all", sort };
  if (categoryId) params.categoryId = categoryId;
  if (importance) params.importance = importance;
  if (urgency) params.urgency = urgency;
  if (timeNature) params.timeNature = timeNature;
  if (hasTime) params.hasTime = hasTime;

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "all", params],
    queryFn: () => api.getCards(params),
  });

  const selectClass = "px-2 py-1 rounded border text-sm";
  const selectStyle = { borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" };

  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-lg font-medium mb-3 shrink-0">全部视图</h2>
      <div className="flex flex-wrap gap-2 mb-4 text-sm shrink-0">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="">全部分类</option>
          {(catData?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={importance} onChange={(e) => setImportance(e.target.value as PriorityLevel | "")} className={selectClass} style={selectStyle}>
          <option value="">全部重要度</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value as PriorityLevel | "")} className={selectClass} style={selectStyle}>
          <option value="">全部紧急度</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select value={timeNature} onChange={(e) => setTimeNature(e.target.value as TimeNature | "")} className={selectClass} style={selectStyle}>
          <option value="">全部时间性质</option>
          <option value="duration">持续型</option>
          <option value="deadline">截止型</option>
        </select>
        <select value={hasTime} onChange={(e) => setHasTime(e.target.value as "" | "true" | "false")} className={selectClass} style={selectStyle}>
          <option value="">有无时间</option>
          <option value="true">有时间</option>
          <option value="false">无时间</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as CardSort)} className={selectClass} style={selectStyle}>
          <option value="time">按时间</option>
          <option value="priority">按优先级</option>
          <option value="title">按标题</option>
          <option value="createdAt">按创建时间</option>
        </select>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <p>加载中…</p>
        ) : (
          <CardGrid cards={data?.items ?? []} onCardClick={onCardClick} emptyMessage="暂无日程" />
        )}
      </div>
    </div>
  );
}
