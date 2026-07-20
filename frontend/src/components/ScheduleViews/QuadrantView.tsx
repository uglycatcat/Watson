import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ScheduleCard } from "../../lib/api";
import { PriorityMeter } from "../cards/PriorityMeter";

interface QuadrantViewProps {
  cards: ScheduleCard[];
  onClose?: () => void;
  variant?: "overlay" | "embedded";
  onHoverCardIds?: (ids: ReadonlySet<string>) => void;
}

interface Bucket {
  urgency: number;
  importance: number;
  cards: ScheduleCard[];
}

const SIZE = 560;
const PAD = 44;
const PLOT = SIZE - PAD * 2;
const MAX_RADIUS = 18;
const MIN_RADIUS = 6;
const TOOLTIP_MAX = 5;

function xPos(urgency: number): number {
  return PAD + (urgency / 10) * PLOT;
}

function yPos(importance: number): number {
  return PAD + PLOT - (importance / 10) * PLOT;
}

function radiusForCount(count: number, maxCount: number): number {
  if (count <= 1) return MIN_RADIUS;
  const t = Math.min(1, count / Math.max(maxCount, 1));
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export function QuadrantView({ cards, onClose, variant = "overlay", onHoverCardIds }: QuadrantViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Bucket | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const embedded = variant === "embedded";

  useEffect(() => {
    if (embedded || !onClose) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [onClose, embedded]);

  const buckets = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const card of cards) {
      const key = `${card.urgency},${card.importance}`;
      const existing = map.get(key);
      if (existing) existing.cards.push(card);
      else map.set(key, { urgency: card.urgency, importance: card.importance, cards: [card] });
    }
    return Array.from(map.values());
  }, [cards]);

  const maxCount = useMemo(() => Math.max(1, ...buckets.map((b) => b.cards.length)), [buckets]);

  const originX = xPos(5);
  const originY = yPos(5);

  const plot = (
    <div
      ref={ref}
      className={embedded ? "w-full h-full flex flex-col min-h-0 p-2 relative" : "relative rounded-lg border p-4"}
      style={
        embedded
          ? undefined
          : {
              background: "var(--panel)",
              borderColor: "var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
            }
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">坐标视图</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1 rounded-md border transition-interactive"
              style={{ borderColor: "var(--border)" }}
            >
              关闭
            </button>
          )}
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <svg
          width={embedded ? "100%" : SIZE}
          height={embedded ? "100%" : SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={embedded ? "flex-1 min-h-0 w-full h-full" : undefined}
          preserveAspectRatio={embedded ? "none" : "xMidYMid meet"}
          style={{ color: "var(--fg)" }}
        >
          {/* Quadrant backgrounds: Q1 top-right 立即做, Q2 top-left 计划做, Q3 bottom-left 减少做, Q4 bottom-right 授权做 */}
          <rect x={originX} y={PAD} width={SIZE - PAD - originX} height={originY - PAD} fill="var(--quadrant-q1)" />
          <rect x={PAD} y={PAD} width={originX - PAD} height={originY - PAD} fill="var(--quadrant-q2)" />
          <rect x={PAD} y={originY} width={originX - PAD} height={SIZE - PAD - originY} fill="var(--quadrant-q3)" />
          <rect x={originX} y={originY} width={SIZE - PAD - originX} height={SIZE - PAD - originY} fill="var(--quadrant-q4)" />

          {/* Quadrant labels */}
          <text x={originX + (SIZE - PAD - originX) / 2} y={PAD + 16} textAnchor="middle" fontSize={13} fill="var(--muted)">
            立即做
          </text>
          <text x={PAD + (originX - PAD) / 2} y={PAD + 16} textAnchor="middle" fontSize={13} fill="var(--muted)">
            计划做
          </text>
          <text x={PAD + (originX - PAD) / 2} y={SIZE - PAD - 8} textAnchor="middle" fontSize={13} fill="var(--muted)">
            减少做
          </text>
          <text x={originX + (SIZE - PAD - originX) / 2} y={SIZE - PAD - 8} textAnchor="middle" fontSize={13} fill="var(--muted)">
            授权做
          </text>

          {/* Axes */}
          <line x1={PAD} y1={originY} x2={SIZE - PAD} y2={originY} stroke="var(--fg)" strokeWidth={2} opacity={0.35} />
          <line x1={originX} y1={PAD} x2={originX} y2={SIZE - PAD} stroke="var(--fg)" strokeWidth={2} opacity={0.35} />

          <text x={SIZE - PAD} y={originY + 18} textAnchor="end" fontSize={14} fill="var(--muted)">
            紧急度 →
          </text>
          <text x={originX + 8} y={PAD + 16} fontSize={14} fill="var(--muted)">
            ↑ 重要度
          </text>

          {/* Origin (5,5) */}
          <circle cx={originX} cy={originY} r={4} fill="var(--accent)" opacity={0.9} />
          <text x={originX + 8} y={originY - 5} fontSize={11} fill="var(--muted)">
            (5,5)
          </text>

          {buckets.map((b) => {
            const cx = xPos(b.urgency);
            const cy = yPos(b.importance);
            const r = radiusForCount(b.cards.length, maxCount);
            return (
              <circle
                key={`${b.urgency}-${b.importance}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="var(--accent)"
                opacity={0.85}
                className={hover === b ? "quadrant-dot is-hovered" : "quadrant-dot"}
                style={{ cursor: "default", transformOrigin: `${cx}px ${cy}px` }}
                onMouseEnter={(e) => {
                  setHover(b);
                  onHoverCardIds?.(new Set(b.cards.map((card) => card.id)));
                  const rect = (e.target as SVGCircleElement).getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => {
                  setHover(null);
                  onHoverCardIds?.(new Set());
                }}
                onClick={(e) => e.stopPropagation()}
              />
            );
          })}
        </svg>
      </div>

      {hover && (
        <div
          className="fixed z-50 rounded-md border p-3 text-xs max-w-[220px] pointer-events-none"
          style={{
            background: "var(--panel)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-md)",
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hover.cards.slice(0, TOOLTIP_MAX).map((c) => (
            <div key={c.id} className="mb-2 last:mb-0">
              <div className="font-medium truncate mb-1">{c.title}</div>
              <PriorityMeter label="重要" value={c.importance} compact showNumber />
              <PriorityMeter label="紧急" value={c.urgency} compact showNumber />
            </div>
          ))}
          {hover.cards.length > TOOLTIP_MAX && (
            <p style={{ color: "var(--muted)" }}>+{hover.cards.length - TOOLTIP_MAX} 更多</p>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) return plot;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 modal-backdrop-enter" aria-hidden />
      {plot}
    </div>,
    document.body,
  );
}
