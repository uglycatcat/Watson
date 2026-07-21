import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import type { CardStage, ScheduleCard } from "../../lib/api";
import { CompleteCheckbox } from "../cards/CompleteCheckbox";
import { PriorityMeter } from "../cards/PriorityMeter";
import { getCategoryAccent } from "../../lib/categoryColor";
import { setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";

export type CardGridSortMode = "createdAtDesc" | "preserve" | "stageThenCreatedAtDesc";

interface CardGridProps {
  cards: ScheduleCard[];
  onCardClick?: (card: ScheduleCard) => void;
  emptyMessage?: string;
  showComplete?: boolean;
  sortMode?: CardGridSortMode;
  renderCardChrome?: (card: ScheduleCard) => ReactNode;
  draggableCards?: boolean;
  showStage?: boolean;
  showHoverBar?: boolean;
  overdueCardIds?: ReadonlySet<string>;
  highlightedCardIds?: ReadonlySet<string>;
  onHoverCardChange?: (id: string | null) => void;
}

/** 等待收尾 → 正在处理 → 未开始 */
const STAGE_SORT_RANK: Record<CardStage, number> = {
  wrapping_up: 0,
  in_progress: 1,
  not_started: 2,
};

function cardSubtitle(c: ScheduleCard): string {
  if (!c.startAt) return "未安排";
  const start = formatTime(c.startAt);
  const end = c.endAt ? formatTime(c.endAt) : null;
  return end ? `${start} – ${end}` : start;
}

function sortByCreatedAtDesc(cards: ScheduleCard[]): ScheduleCard[] {
  return [...cards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function sortByStageThenCreatedAtDesc(cards: ScheduleCard[]): ScheduleCard[] {
  return [...cards].sort((a, b) => {
    const stageDiff =
      STAGE_SORT_RANK[a.stage ?? "not_started"] - STAGE_SORT_RANK[b.stage ?? "not_started"];
    if (stageDiff !== 0) return stageDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function CardGrid({
  cards,
  onCardClick,
  emptyMessage = "暂无日程",
  showComplete = false,
  sortMode = "createdAtDesc",
  renderCardChrome,
  draggableCards = false,
  showStage = true,
  showHoverBar = false,
  overdueCardIds,
  highlightedCardIds,
  onHoverCardChange,
}: CardGridProps) {
  const sorted = useMemo(() => {
    if (sortMode === "preserve") return cards;
    if (sortMode === "stageThenCreatedAtDesc") return sortByStageThenCreatedAtDesc(cards);
    return sortByCreatedAtDesc(cards);
  }, [cards, sortMode]);

  if (!sorted.length) {
    return <p style={{ color: "var(--muted)" }}>{emptyMessage}</p>;
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
    >
      {sorted.map((c) => {
        const canDrag = draggableCards && c.status === "active";
        const accent = getCategoryAccent(c.categoryColor);
        return (
          <div key={c.id}>
            <div
              role={onCardClick ? "button" : undefined}
              tabIndex={onCardClick ? 0 : undefined}
              draggable={canDrag}
              onDragStart={(e) => {
                if (!canDrag) return;
                setDragCardId(e.dataTransfer, c.id);
                const preview = e.currentTarget.cloneNode(true) as HTMLElement;
                preview.classList.add("drag-card-preview");
                document.body.appendChild(preview);
                e.dataTransfer.setDragImage(preview, 24, 24);
                requestAnimationFrame(() => preview.remove());
              }}
              onMouseEnter={() => onHoverCardChange?.(c.id)}
              onMouseLeave={() => onHoverCardChange?.(null)}
              onClick={() => onCardClick?.(c)}
              onKeyDown={(e) => {
                if (!onCardClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick(c);
                }
              }}
              className={`schedule-card relative w-full text-left text-sm transition-interactive hover:opacity-95 min-h-[88px] flex gap-2 overflow-hidden ${renderCardChrome ? "pb-8" : ""} ${showHoverBar ? "show-hover-bar" : ""} ${overdueCardIds?.has(c.id) ? "is-overdue" : ""} ${highlightedCardIds?.has(c.id) ? "is-highlighted" : ""}`}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                cursor: canDrag ? "grab" : onCardClick ? "pointer" : "default",
                padding: "var(--space-3)",
                borderLeftWidth: "4px",
                borderLeftColor: accent,
              }}
            >
              {showHoverBar && <span className="card-hover-bar" aria-hidden />}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="font-semibold line-clamp-2 pr-16" style={{ fontSize: "var(--text-sm)" }}>
                  {c.title}
                </div>
                <div className="text-xs line-clamp-1" style={{ color: "var(--muted)" }}>
                  {cardSubtitle(c)}
                  {c.categoryName ? ` · ${c.categoryName}` : ""}
                </div>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <PriorityMeter label="重要" value={c.importance} compact />
                  <PriorityMeter label="紧急" value={c.urgency} compact />
                </div>
              </div>
              {showStage && <span className={`absolute top-2 ${showComplete || renderCardChrome ? "right-9" : "right-2"}`}><StageBadge stage={c.stage} compact /></span>}
              {showComplete && <CompleteCheckbox cardId={c.id} className="mt-0.5" />}
              {renderCardChrome?.(c)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "MM-dd HH:mm");
}
