import type { ScheduleCard } from "../../lib/api";
import { setDragCardId } from "../dnd/dragTrash";

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
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        setDragCardId(e.dataTransfer, card.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(card);
      }}
      className="absolute pointer-events-auto transition-interactive"
      style={{
        top: topOffset + lane * LANE_HEIGHT,
        left: `calc(${(startCol / 7) * 100}% + 2px)`,
        width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`,
        height: LANE_HEIGHT - 4,
        background: "var(--accent)",
        opacity: 0.9,
        zIndex: 2,
        cursor: draggable ? "grab" : "pointer",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-sm)",
      }}
      title={card.title}
      aria-label={card.title}
    >
      <span
        className="absolute text-left text-xs px-1 truncate text-white"
        style={{
          left: 0,
          top: 0,
          width: COL_WIDTH,
          height: LANE_HEIGHT - 4,
          lineHeight: `${LANE_HEIGHT - 8}px`,
        }}
      >
        {card.title}
      </span>
    </button>
  );
}

export { LANE_HEIGHT };
