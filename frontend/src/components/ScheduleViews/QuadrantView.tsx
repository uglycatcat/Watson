import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleCard } from "../../lib/api";
import { PriorityMeter } from "../cards/PriorityMeter";

interface QuadrantViewProps {
  cards: ScheduleCard[];
  onClose?: () => void;
  variant?: "overlay" | "embedded";
}

interface Bucket {
  urgency: number;
  importance: number;
  cards: ScheduleCard[];
}

const SIZE = 400;
const PAD = 40;
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

export function QuadrantView({ cards, onClose, variant = "overlay" }: QuadrantViewProps) {
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
  const sparse = cards.length <= 1;

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
          preserveAspectRatio="xMidYMid meet"
          style={{ color: "var(--fg)" }}
        >
          {/* Quadrant backgrounds: Q1 top-right 立即做, Q2 top-left 计划做, Q3 bottom-left 减少做, Q4 bottom-right 授权做 */}
          <rect x={originX} y={PAD} width={SIZE - PAD - originX} height={originY - PAD} fill="var(--quadrant-q1)" />
          <rect x={PAD} y={PAD} width={originX - PAD} height={originY - PAD} fill="var(--quadrant-q2)" />
          <rect x={PAD} y={originY} width={originX - PAD} height={SIZE - PAD - originY} fill="var(--quadrant-q3)" />
          <rect x={originX} y={originY} width={SIZE - PAD - originX} height={SIZE - PAD - originY} fill="var(--quadrant-q4)" />

          {/* Quadrant labels */}
          <text x={originX + (SIZE - PAD - originX) / 2} y={PAD + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">
            立即做
          </text>
          <text x={PAD + (originX - PAD) / 2} y={PAD + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">
            计划做
          </text>
          <text x={PAD + (originX - PAD) / 2} y={SIZE - PAD - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">
            减少做
          </text>
          <text x={originX + (SIZE - PAD - originX) / 2} y={SIZE - PAD - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">
            授权做
          </text>

          {/* Axes */}
          <line x1={PAD} y1={originY} x2={SIZE - PAD} y2={originY} stroke="var(--fg)" strokeWidth={2} opacity={0.35} />
          <line x1={originX} y1={PAD} x2={originX} y2={SIZE - PAD} stroke="var(--fg)" strokeWidth={2} opacity={0.35} />

          <text x={SIZE - PAD} y={originY + 14} textAnchor="end" fontSize={10} fill="var(--muted)">
            紧急度 →
          </text>
          <text x={originX + 6} y={PAD + 12} fontSize={10} fill="var(--muted)">
            ↑ 重要度
          </text>

          {/* Origin (5,5) */}
          <circle cx={originX} cy={originY} r={4} fill="var(--accent)" opacity={0.9} />
          <text x={originX + 6} y={originY - 4} fontSize={8} fill="var(--muted)">
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
                style={{ cursor: "default" }}
                onMouseEnter={(e) => {
                  setHover(b);
                  const rect = (e.target as SVGCircleElement).getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => e.stopPropagation()}
              />
            );
          })}
        </svg>

        {sparse && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none px-8 text-center"
            style={{ color: "var(--muted)" }}
          >
            <p className="text-xs leading-relaxed">
              {cards.length === 0
                ? "当前没有可展示的日程。创建日程后，将按重要度与紧急度分布在此图中。"
                : "仅有一个任务时也会显示在此。继续添加日程以观察分布。"}
            </p>
          </div>
        )}
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 modal-backdrop-enter" aria-hidden />
      {plot}
    </div>
  );
}
