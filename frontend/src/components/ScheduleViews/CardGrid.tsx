import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import type { ScheduleCard } from "../../lib/api";
import { isIndependentStandard, isParentCard } from "../../lib/api";
import { cardDateSubtitle, sortByStageThenCreatedAtDesc } from "../../lib/cardDisplay";
import { CompleteCheckbox } from "../cards/CompleteCheckbox";
import { PriorityMeter } from "../cards/PriorityMeter";
import { getCategoryAccent } from "../../lib/categoryColor";
import { clearDragCardId, getDragCardId, isCardDrag, setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";
import { CategoryBadge } from "../cards/CategoryBadge";

export type CardGridSortMode = "createdAtDesc" | "preserve" | "stageThenCreatedAtDesc";

type ComposeDropMode = "compose" | "add" | "merge" | "forbid" | null;

interface CardGridProps {
  cards: ScheduleCard[];
  onCardClick?: (card: ScheduleCard) => void;
  emptyMessage?: string;
  showComplete?: boolean;
  /** Keep trailing w-5 column when complete checkbox is hidden (e.g. trash). */
  reserveCompleteSlot?: boolean;
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

function sortByCreatedAtDesc(cards: ScheduleCard[]): ScheduleCard[] {
  return [...cards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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
  reserveCompleteSlot = false,
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
    clearDragCardId();

    if (!source || !mode || mode === "forbid") return;

    // Compose opens parent-detail draft until confirm; add/merge animate after success.
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
      className="grid gap-3 items-center"
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
          "schedule-card relative w-full text-left text-sm transition-interactive flex gap-2",
          isParent ? "parent-cover-card overflow-hidden min-h-[115px]" : "min-h-[107px]",
          !isParent && !(showParentFold && (c.parentId || c.lastParentTitle)) ? "overflow-hidden" : "",
          !isParent && showParentFold && (c.parentId || c.lastParentTitle) ? "overflow-visible" : "",
          renderCardChrome ? "pb-8" : "",
          showHoverBar ? "show-hover-bar" : "",
          overdueCardIds?.has(c.id) ? "is-overdue" : "",
          highlightedCardIds?.has(c.id) ? "is-highlighted" : "",
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

        const childCategories = c.childCategories ?? [];
        const spineCategories = childCategories.slice(0, 6);

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
                clearDragCardId();
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
                backgroundColor: isParent ? "var(--parent-cover-bg)" : "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                cursor: canDrag ? "grab" : onCardClick || onParentClick ? "pointer" : "default",
                padding: isParent ? 0 : "var(--space-3)",
                borderLeftWidth: isParent ? "1px" : "4px",
                borderLeftColor: accent,
                ...(collapseSourceId === c.id ? collapseStyle : null),
              }}
              title={isDragTarget && mode === "forbid" ? composeDisabledReason : undefined}
            >
              {showHoverBar && <span className="card-hover-bar" aria-hidden />}
              {showParentFold && (c.parentId || c.lastParentTitle) && (
                c.parentId ? (
                  <button
                    type="button"
                    className="parent-fold-corner"
                    data-tip={c.parentTitle ?? "查看父卡片"}
                    aria-label={c.parentTitle ? `原属：${c.parentTitle}` : "查看父卡片"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.parentId) onParentFoldClick?.(c.parentId, c.parentTitle);
                    }}
                  />
                ) : (
                  <span
                    className="parent-fold-corner"
                    data-tip={c.lastParentTitle ? `原属：${c.lastParentTitle}` : undefined}
                    aria-label={c.lastParentTitle ? `原属：${c.lastParentTitle}` : "原属父卡片"}
                  />
                )
              )}
              {isParent ? (
                <>
                  <span className="parent-cover-topband" aria-hidden />
                  <div className="parent-cover-body">
                    <div className="parent-cover-title">{c.title}</div>
                  </div>
                  <div className="parent-cover-meta">
                    <div className="parent-cover-meta-row">
                      <span className="truncate flex-1 min-w-0">{cardDateSubtitle(c)}</span>
                      {previewCount != null && (
                        <span
                          className="parent-child-badge parent-child-badge--meta"
                          aria-label={`${previewCount} 张子卡片`}
                        >
                          {previewCount}
                        </span>
                      )}
                    </div>
                    {childCategories.length > 0 && (
                      <div className="parent-cover-badges">
                        {childCategories.map((cat) => (
                          <CategoryBadge key={cat.id} name={cat.name} color={cat.color} compact />
                        ))}
                      </div>
                    )}
                  </div>
                  {spineCategories.length > 0 && (
                    <div className="parent-cover-spine" aria-hidden>
                      {spineCategories.map((cat) => (
                        <span key={cat.id} style={{ background: getCategoryAccent(cat.color) }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div
                      className="card-title font-semibold line-clamp-1"
                      style={{ fontSize: "var(--text-sm)", color: "var(--fg-strong)" }}
                    >
                      {c.title}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="text-xs line-clamp-1 min-w-0 flex-1"
                        style={{ color: "var(--muted)", fontFamily: "var(--font-sans)", letterSpacing: "0.01em" }}
                      >
                        {cardDateSubtitle(c)}
                      </div>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <CategoryBadge name={c.categoryName} color={c.categoryColor} compact />
                        {showStage && <StageBadge stage={c.stage} compact />}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5 w-full min-w-0">
                      <PriorityMeter label="重要" value={c.importance} compact />
                      <PriorityMeter label="紧急" value={c.urgency} compact />
                    </div>
                  </div>
                  {showComplete && <CompleteCheckbox cardId={c.id} className="mt-0.5" />}
                  {!showComplete && reserveCompleteSlot && (
                    <span className="shrink-0 w-5 mt-0.5" aria-hidden />
                  )}
                </>
              )}
              {renderCardChrome?.(c)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
