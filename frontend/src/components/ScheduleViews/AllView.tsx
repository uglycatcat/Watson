import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isParentCard, type CardStage, type ScheduleCard } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { buildAllSections } from "../calendar/allSections";
import { collectOverdueCardIds } from "../../lib/cardDisplay";
import { CardGrid } from "./CardGrid";
import { QuadrantView } from "./QuadrantView";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCardGrid } from "../ui/Skeleton";
import { ConsoleSelect } from "../ui/ConsoleSelect";
import { ShellMotto } from "../ShellMotto";

interface AllViewProps {
  onCardClick: (card: ScheduleCard) => void;
  onParentClick?: (card: ScheduleCard) => void;
  onCreateClick?: () => void;
  onComposeDraft?: (a: ScheduleCard, b: ScheduleCard) => void;
  composeSuccessAnim?: { sourceIds: string[]; targetId: string } | null;
}

const STAGE_LABELS: Record<CardStage, string> = {
  not_started: "未开始",
  in_progress: "正在处理",
  wrapping_up: "等待收尾",
};

export function AllView({
  onCardClick,
  onParentClick,
  onCreateClick,
  onComposeDraft,
  composeSuccessAnim = null,
}: AllViewProps) {
  const { addChildToParent, mergeParents } = useCardMutations();
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState("");
  const [urgency, setUrgency] = useState("");
  const [stage, setStage] = useState<"" | CardStage>("");
  const [quadrantOpen, setQuadrantOpen] = useState(false);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateScrollEdges = () => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollEdges({
      top: element.scrollTop > 2,
      bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 2,
    });
  };

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

  // Undated view=day returns every active standard (incl. parent members) for the coordinate chart.
  const quadrantParams: Record<string, string> = { view: "day" };
  if (categoryId) quadrantParams.categoryId = categoryId;
  if (importance !== "") quadrantParams.importance = importance;
  if (urgency !== "") quadrantParams.urgency = urgency;
  if (stage) quadrantParams.stage = stage;

  const { data: quadrantData } = useQuery({
    queryKey: ["cards", "all-quadrant", quadrantParams],
    queryFn: () => api.getCards(quadrantParams),
    enabled: quadrantOpen,
  });

  const cards = data?.items ?? [];
  const composeLookup = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const quadrantCards = useMemo(
    () => (quadrantData?.items ?? []).filter((c) => !isParentCard(c)),
    [quadrantData],
  );
  const sections = useMemo(() => buildAllSections(cards), [cards]);
  const overdueCardIds = useMemo(() => collectOverdueCardIds(cards), [cards]);

  const categories = catData?.items ?? [];
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  const priorityOptions = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (categoryId) activeChips.push({ key: "cat", label: `分类 · ${categoryName}`, clear: () => setCategoryId("") });
  if (importance !== "") activeChips.push({ key: "imp", label: `重要度 · ${importance}`, clear: () => setImportance("") });
  if (urgency !== "") activeChips.push({ key: "urg", label: `紧急度 · ${urgency}`, clear: () => setUrgency("") });
  if (stage) activeChips.push({ key: "stg", label: `阶段 · ${STAGE_LABELS[stage]}`, clear: () => setStage("") });

  const clearAll = () => {
    setCategoryId("");
    setImportance("");
    setUrgency("");
    setStage("");
  };

  const filteredEmpty = !isLoading && cards.length === 0;
  const allSections = [
    ["已安排", sections.scheduled],
    ["未安排", sections.unscheduled],
  ] as const;

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollEdges);
    return () => cancelAnimationFrame(frame);
  }, [cards.length, categoryId, importance, urgency, stage]);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* ── Console header ── */}
      <div className="flex items-end gap-3 mb-3 shrink-0">
        <div className="flex flex-col min-w-0">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.22em",
              color: "var(--muted)",
            }}
          >
            ALL RECORDS
          </span>
          <h2
            className="view-title font-semibold leading-none"
            style={{ fontSize: "1.5rem", color: "var(--fg-strong)", marginTop: "6px" }}
          >
            全部视图
          </h2>
        </div>
        <ShellMotto />
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setQuadrantOpen(true)}
          className="quadrant-launch"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 14V2M2 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="6" cy="9" r="1.4" fill="currentColor" />
            <circle cx="10" cy="5" r="1.4" fill="currentColor" />
            <circle cx="11.5" cy="10.5" r="1.4" fill="currentColor" />
          </svg>
          <span>坐标视图</span>
        </button>
      </div>

      {/* ── Filter console ── */}
      <div className="filter-console mb-2 shrink-0">
        <span className="filter-console__tag">FILTERS</span>
        <ConsoleSelect
          label="分类"
          allLabel="全部分类"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <ConsoleSelect label="重要度" allLabel="全部" value={importance} onChange={setImportance} options={priorityOptions} />
        <ConsoleSelect label="紧急度" allLabel="全部" value={urgency} onChange={setUrgency} options={priorityOptions} />
        <ConsoleSelect
          label="阶段"
          allLabel="全部阶段"
          value={stage}
          onChange={(v) => setStage(v as "" | CardStage)}
          options={[
            { value: "not_started", label: "未开始" },
            { value: "in_progress", label: "正在处理" },
            { value: "wrapping_up", label: "等待收尾" },
          ]}
        />
        <span className="filter-console__spacer" />
        <span className="filter-console__count">
          <b>{cards.length}</b> 条记录
        </span>
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="filter-chips mb-3 shrink-0">
          {activeChips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button type="button" className="filter-chip__x" onClick={chip.clear} aria-label={`移除 ${chip.label}`}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="filter-clear" onClick={clearAll}>
            清除全部
          </button>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={updateScrollEdges}
          className="h-full min-h-0 overflow-auto"
        >
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
                      onParentClick={onParentClick}
                      showComplete
                      draggableCards
                      sortMode="stageThenCreatedAtDesc"
                      showHoverBar
                      overdueCardIds={overdueCardIds}
                      enableComposeDrop
                      composeCardLookup={composeLookup}
                      composeSuccessAnim={composeSuccessAnim}
                      onComposePair={(a, b) => onComposeDraft?.(a, b)}
                      onAddToParent={async (childId, parentId) => {
                        await addChildToParent({ parentId, cardId: childId });
                      }}
                      onMergeParents={async (sourceId, targetId) => {
                        await mergeParents({ targetId, sourceId });
                      }}
                    />
                  ) : (
                    <p className="day-section-empty">本章节暂无日程</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
        <span className={`scroll-fade scroll-fade-top ${scrollEdges.top ? "is-visible" : ""}`} />
        <span className={`scroll-fade scroll-fade-bottom ${scrollEdges.bottom ? "is-visible" : ""}`} />
      </div>
      {quadrantOpen && <QuadrantView cards={quadrantCards} onClose={() => setQuadrantOpen(false)} />}
    </div>
  );
}
