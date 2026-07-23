import type { ScheduleCard } from "../../lib/api";
import { isParentCard } from "../../lib/api";
import { isOverdueCard } from "../../lib/cardDisplay";
import { setDragCardId } from "../dnd/dragTrash";
import { StageBadge } from "../cards/StageBadge";

interface SpanBarProps {
  card: ScheduleCard;
  startCol: number;
  endCol: number;
  lane: number;
  onClick: (card: ScheduleCard) => void;
  /** Offset below day header row (px) */
  topOffset?: number;
  draggable?: boolean;
}

/** ~2.5× prior lane height (22 → 55) */
const LANE_HEIGHT = 55;
const COL_WIDTH = `calc((1 / 7) * 100% - 4px)`;

export function SpanBar({
  card,
  startCol,
  endCol,
  lane,
  onClick,
  topOffset = 36,
  draggable = true,
}: SpanBarProps) {
  const parent = isParentCard(card);
  const overdue = isOverdueCard(card);
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        setDragCardId(e.dataTransfer, card.id);
        const preview = e.currentTarget.cloneNode(true) as HTMLElement;
        preview.classList.add("drag-card-preview");
        document.body.appendChild(preview);
        e.dataTransfer.setDragImage(preview, 24, 20);
        requestAnimationFrame(() => preview.remove());
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(card);
      }}
      className={`absolute pointer-events-auto transition-interactive ${parent ? "parent-span-bar" : "cal-chip"} ${overdue ? "is-overdue" : ""}`}
      style={{
        top: topOffset + lane * LANE_HEIGHT,
        left: `calc(${(startCol / 7) * 100}% + 2px)`,
        width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`,
        height: LANE_HEIGHT - 4,
        background: overdue
          ? `linear-gradient(to left, var(--overdue-wash), transparent 70%), ${parent ? "var(--accent-subtle)" : "var(--accent)"}`
          : parent
            ? "var(--accent-subtle)"
            : "var(--accent)",
        color: parent ? "var(--fg)" : "var(--on-accent)",
        opacity: 0.95,
        zIndex: 2,
        cursor: draggable ? "grab" : "pointer",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-sm)",
        border: parent ? "1px solid var(--border)" : undefined,
      }}
      title={card.title}
      aria-label={card.title}
    >
      <span
        className="absolute text-left text-xs px-1 truncate"
        style={{
          left: 0,
          top: 0,
          width: COL_WIDTH,
          height: LANE_HEIGHT - 4,
          lineHeight: `${LANE_HEIGHT - 8}px`,
          color: "inherit",
        }}
      >
        <span className={`block truncate ${parent ? "pr-7" : "pr-14"}`}>{card.title}</span>
        {parent ? (
          <span className="parent-child-badge parent-child-badge--compact" aria-label={`${card.childCount ?? 0} 张子卡片`}>
            {card.childCount ?? 0}
          </span>
        ) : (
          <span className="absolute right-1 top-1">
            <StageBadge stage={card.stage} compact />
          </span>
        )}
      </span>
    </button>
  );
}

export { LANE_HEIGHT };
