import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type CardStage, type ScheduleCard } from "../../lib/api";
import { buildAllSections } from "../calendar/allSections";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCardGrid } from "../ui/Skeleton";

interface AllViewProps {
  onCardClick: (card: ScheduleCard) => void;
  onCreateClick?: () => void;
}

export function AllView({ onCardClick, onCreateClick }: AllViewProps) {
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState("");
  const [urgency, setUrgency] = useState("");
  const [stage, setStage] = useState<"" | CardStage>("");
  const [quadrantOpen, setQuadrantOpen] = useState(false);

  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  const params: Record<string, string> = { view: "all" };
  if (categoryId) params.categoryId = categoryId;
  if (importance !== "") params.importance = importance;
  if (urgency !== "") params.urgency = urgency;
  if (stage) params.stage = stage;

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "all", params],
    queryFn: () => api.getCards(params),
  });

  const cards = data?.items ?? [];
  const sections = useMemo(() => buildAllSections(cards), [cards]);
  const overdueCardIds = new Set(
    cards
      .filter((card) => card.status === "active" && card.startAt && card.endAt && new Date(card.endAt).getTime() < Date.now())
      .map((card) => card.id),
  );
  const selectClass = "px-2 py-1 rounded-md border text-sm transition-interactive";
  const selectStyle = { borderColor: "var(--border)", background: "var(--panel)", color: "var(--fg)" };

  const priorityOptions = Array.from({ length: 11 }, (_, i) => (
    <option key={i} value={String(i)}>
      {i}
    </option>
  ));

  const filteredEmpty = !isLoading && cards.length === 0;
  const allSections = [
    ["已安排", sections.scheduled],
    ["未安排", sections.unscheduled],
  ] as const;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h2 className="text-lg font-semibold flex-1">全部视图</h2>
        <span className="inline-block" style={{ transform: "translateY(calc(100% / 5))" }}>
          <button
            type="button"
            onClick={() => setQuadrantOpen(true)}
            className="text-sm px-2 py-1 border transition-interactive nav-time-btn"
            style={{ borderColor: "var(--border)", borderRadius: "var(--radius-md)" }}
          >
            坐标视图
          </button>
        </span>
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
        <select value={stage} onChange={(e) => setStage(e.target.value as "" | CardStage)} className={selectClass} style={selectStyle}>
          <option value="">全部阶段</option>
          <option value="not_started">未开始</option>
          <option value="in_progress">正在处理</option>
          <option value="wrapping_up">等待收尾</option>
        </select>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <SkeletonCardGrid />
        ) : filteredEmpty ? (
          <EmptyState
            icon="📋"
            title="还没有日程"
            description="创建第一条日程，或调整上方筛选条件"
            action={onCreateClick ? { label: "新建日程", onClick: onCreateClick } : undefined}
          />
        ) : (
          <div className="day-sections">
            {allSections.map(([title, sectionCards]) => (
              <section className="day-section" key={title}>
                <div className="day-section-heading">
                  <h3>{title}</h3>
                  <span>{sectionCards.length}</span>
                </div>
                {sectionCards.length ? (
                  <CardGrid
                    cards={sectionCards}
                    onCardClick={onCardClick}
                    showComplete
                    draggableCards
                    sortMode="stageThenCreatedAtDesc"
                    showHoverBar
                    overdueCardIds={overdueCardIds}
                  />
                ) : (
                  <p className="day-section-empty">本章节暂无日程</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      {quadrantOpen && <QuadrantView cards={cards} onClose={() => setQuadrantOpen(false)} />}
    </div>
  );
}
