import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { format } from "date-fns";
import type { CardStage, ScheduleCard } from "../../lib/api";
import { isIndependentStandard, isParentCard } from "../../lib/api";
import { CompleteCheckbox } from "../cards/CompleteCheckbox";
import { PriorityMeter } from "../cards/PriorityMeter";
import { getCategoryAccent } from "../../lib/categoryColor";
import { getDragCardId, isCardDrag, setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";

export type CardGridSortMode = "createdAtDesc" | "preserve" | "stageThenCreatedAtDesc";

type ComposeDropMode = "compose" | "add" | "merge" | "forbid" | null;

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
  enableComposeDrop?: boolean;
  composeCardLookup?: ReadonlyMap<string, ScheduleCard>;
  onComposePair?: (a: ScheduleCard, b: ScheduleCard) => void;
  onAddToParent?: (childId: string, parentId: string) => void | Promise<unknown>;
  onMergeParents?: (sourceId: string, targetId: string) => void | Promise<unknown>;
  onParentClick?: (card: ScheduleCard) => void;
  composeDisabledReason?: string;
  showParentFold?: boolean;
  onParentFoldClick?: (parentId: string, parentTitle?: string | null) => void;
  /** After successful compose: collapse these source card ids toward targetId */
  composeSuccessAnim?: { sourceIds: string[]; targetId: string } | null;
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

function resolveComposeDrop(
  source: ScheduleCard | undefined,
  target: ScheduleCard,
): ComposeDropMode {
  if (!source || source.id === target.id) return null;
  const sourceIsParent = isParentCard(source);
  const targetIsParent = isParentCard(target);

  if (sourceIsParent && !targetIsParent) return "forbid";
  if (sourceIsParent && targetIsParent) return "merge";
  if (!sourceIsParent && targetIsParent) {
    return isIndependentStandard(source) ? "add" : null;
  }
  if (!sourceIsParent && !targetIsParent) {
    if (isIndependentStandard(source) && isIndependentStandard(target)) return "compose";
  }
  return null;
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
  enableComposeDrop = false,
  composeCardLookup,
  onComposePair,
  onAddToParent,
  onMergeParents,
  onParentClick,
  composeDisabledReason = "不能将父卡片拖入标准卡片",
  showParentFold = false,
  onParentFoldClick,
  composeSuccessAnim = null,
}: CardGridProps) {
  const cardMap = useMemo(() => composeCardLookup ?? new Map(cards.map((c) => [c.id, c])), [cards, composeCardLookup]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<ComposeDropMode>(null);
  const [flyToId, setFlyToId] = useState<string | null>(null);
  const [collapseSourceId, setCollapseSourceId] = useState<string | null>(null);
  const [collapseStyle, setCollapseStyle] = useState<CSSProperties | undefined>();
  const dragSourceIdRef = useRef<string | null>(null);
  const cardNodeRefs = useRef(new Map<string, HTMLElement>());

  const playCollapseToward = (sourceId: string, targetId: string) => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFlyToId(targetId);
      window.setTimeout(() => setFlyToId(null), 120);
      return;
    }
    const srcEl = cardNodeRefs.current.get(sourceId);
    const tgtEl = cardNodeRefs.current.get(targetId);
    if (srcEl && tgtEl) {
      const sr = srcEl.getBoundingClientRect();
      const tr = tgtEl.getBoundingClientRect();
      const dx = tr.left + tr.width / 2 - (sr.left + sr.width / 2);
      const dy = tr.top + tr.height / 2 - (sr.top + sr.height / 2);
      setCollapseStyle({
        ["--compose-collapse-x" as string]: `${dx}px`,
        ["--compose-collapse-y" as string]: `${dy}px`,
      });
      setCollapseSourceId(sourceId);
      setFlyToId(targetId);
      window.setTimeout(() => {
        setCollapseSourceId(null);
        setCollapseStyle(undefined);
        setFlyToId(null);
      }, 320);
    } else {
      setFlyToId(targetId);
      window.setTimeout(() => setFlyToId(null), 320);
    }
  };

  useEffect(() => {
    if (!composeSuccessAnim?.targetId || !composeSuccessAnim.sourceIds.length) return;
    const hasTarget = cards.some((c) => c.id === composeSuccessAnim.targetId);
    const sourceId = composeSuccessAnim.sourceIds.find((id) => cards.some((c) => c.id === id));
    if (!hasTarget && !sourceId) return;
    if (sourceId && hasTarget) {
      playCollapseToward(sourceId, composeSuccessAnim.targetId);
    } else if (hasTarget) {
      setFlyToId(composeSuccessAnim.targetId);
      window.setTimeout(() => setFlyToId(null), 320);
    }
    // playCollapseToward is stable for this payload; cards gate DOM presence after refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeSuccessAnim, cards]);

  const sorted = useMemo(() => {
    if (sortMode === "preserve") return cards;
    if (sortMode === "stageThenCreatedAtDesc") return sortByStageThenCreatedAtDesc(cards);
    return sortByCreatedAtDesc(cards);
  }, [cards, sortMode]);

  const handleDragOver = (e: DragEvent, target: ScheduleCard) => {
    if (!enableComposeDrop || !isCardDrag(e.dataTransfer)) return;
    e.preventDefault();
    const sourceId = getDragCardId(e.dataTransfer) ?? dragSourceIdRef.current;
    const source = sourceId ? cardMap.get(sourceId) : undefined;
    const mode = resolveComposeDrop(source, target);
    setDragOverId(target.id);
    setDropMode(mode);
    e.dataTransfer.dropEffect = mode === "forbid" ? "none" : "move";
  };

  const handleDragLeave = (targetId: string) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
      setDropMode(null);
    }
  };

  const handleDrop = (e: DragEvent, target: ScheduleCard) => {
    if (!enableComposeDrop || !isCardDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const sourceId = getDragCardId(e.dataTransfer) ?? dragSourceIdRef.current;
    const source = sourceId ? cardMap.get(sourceId) : undefined;
    const mode = resolveComposeDrop(source, target);
    setDragOverId(null);
    setDropMode(null);
    dragSourceIdRef.current = null;

    if (!source || !mode || mode === "forbid") return;

    // Compose waits for CreateParentModal confirm (T054); add/merge animate after success (T055).
    if (mode === "compose") {
      onComposePair?.(source, target);
      return;
    }
    if (mode === "add") {
      void Promise.resolve(onAddToParent?.(source.id, target.id)).then(() => {
        playCollapseToward(source.id, target.id);
      });
      return;
    }
    if (mode === "merge") {
      void Promise.resolve(onMergeParents?.(source.id, target.id)).then(() => {
        playCollapseToward(source.id, target.id);
      });
    }
  };

  if (!sorted.length) {
    return <p style={{ color: "var(--muted)" }}>{emptyMessage}</p>;
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}
    >
      {sorted.map((c) => {
        const isParent = isParentCard(c);
        const canDrag = draggableCards && c.status === "active";
        const accent = isParent ? "transparent" : getCategoryAccent(c.categoryColor);
        const isDragTarget = dragOverId === c.id;
        const mode = isDragTarget ? dropMode : null;
        const previewCount =
          isParent && mode === "add" && c.childCount != null ? c.childCount + 1 : c.childCount;

        const cardClasses = [
          "schedule-card relative w-full text-left text-sm transition-interactive hover:opacity-95 min-h-[88px] flex gap-2 overflow-hidden",
          renderCardChrome ? "pb-8" : "",
          showHoverBar && !isParent ? "show-hover-bar" : "",
          overdueCardIds?.has(c.id) ? "is-overdue" : "",
          highlightedCardIds?.has(c.id) ? "is-highlighted" : "",
          isParent ? "parent-card-stack" : "",
          isDragTarget && mode && mode !== "forbid" ? "compose-drop-target" : "",
          isDragTarget && mode === "forbid" ? "compose-drop-forbid" : "",
          flyToId === c.id ? "compose-drop-fly" : "",
          collapseSourceId === c.id ? "compose-source-collapse" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const handleClick = () => {
          if (isParent) onParentClick?.(c);
          else onCardClick?.(c);
        };

        return (
          <div key={c.id}>
            <div
              ref={(el) => {
                if (el) cardNodeRefs.current.set(c.id, el);
                else cardNodeRefs.current.delete(c.id);
              }}
              data-card-id={c.id}
              role={onCardClick || onParentClick ? "button" : undefined}
              tabIndex={onCardClick || onParentClick ? 0 : undefined}
              draggable={canDrag}
              onDragStart={(e) => {
                if (!canDrag) return;
                dragSourceIdRef.current = c.id;
                setDragCardId(e.dataTransfer, c.id);
                e.currentTarget.classList.add("is-dragging");
                const preview = e.currentTarget.cloneNode(true) as HTMLElement;
                preview.classList.add("drag-card-preview");
                document.body.appendChild(preview);
                e.dataTransfer.setDragImage(preview, 24, 24);
                requestAnimationFrame(() => preview.remove());
              }}
              onDragEnd={(e) => {
                e.currentTarget.classList.remove("is-dragging");
                dragSourceIdRef.current = null;
                setDragOverId(null);
                setDropMode(null);
              }}
              onDragOver={(e) => handleDragOver(e, c)}
              onDragLeave={() => handleDragLeave(c.id)}
              onDrop={(e) => handleDrop(e, c)}
              onMouseEnter={() => onHoverCardChange?.(c.id)}
              onMouseLeave={() => onHoverCardChange?.(null)}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (!onCardClick && !onParentClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }}
              className={cardClasses}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                cursor: canDrag ? "grab" : onCardClick || onParentClick ? "pointer" : "default",
                padding: "var(--space-3)",
                borderLeftWidth: isParent ? "1px" : "4px",
                borderLeftColor: accent,
                ...(collapseSourceId === c.id ? collapseStyle : null),
              }}
              title={isDragTarget && mode === "forbid" ? composeDisabledReason : undefined}
            >
              {showHoverBar && !isParent && <span className="card-hover-bar" aria-hidden />}
              {isParent && previewCount != null && (
                <span className="parent-child-badge" aria-label={`${previewCount} 张子卡片`}>
                  {previewCount}
                </span>
              )}
              {showParentFold && c.parentId && (
                <button
                  type="button"
                  className="parent-fold-corner"
                  title={c.parentTitle ?? "查看父卡片"}
                  aria-label={c.parentTitle ? `原属：${c.parentTitle}` : "查看父卡片"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (c.parentId) onParentFoldClick?.(c.parentId, c.parentTitle);
                  }}
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="font-semibold line-clamp-2 pr-16" style={{ fontSize: "var(--text-sm)" }}>
                  {c.title}
                </div>
                <div className="text-xs line-clamp-1" style={{ color: "var(--muted)" }}>
                  {cardSubtitle(c)}
                  {!isParent && c.categoryName ? ` · ${c.categoryName}` : ""}
                </div>
                {!isParent && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <PriorityMeter label="重要" value={c.importance} compact />
                    <PriorityMeter label="紧急" value={c.urgency} compact />
                  </div>
                )}
              </div>
              {showStage && !isParent && (
                <span className={`absolute top-2 ${showComplete || renderCardChrome ? "right-9" : "right-2"}`}>
                  <StageBadge stage={c.stage} compact />
                </span>
              )}
              {showComplete && !isParent && <CompleteCheckbox cardId={c.id} className="mt-0.5" />}
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
