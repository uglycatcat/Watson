import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleCard } from "../../lib/api";

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

  const plot = (
    <div ref={ref} className={embedded ? "w-full h-full flex flex-col min-h-0 p-2" : "relative rounded-lg border shadow-xl p-4"} style={embedded ? undefined : { background: "var(--panel)", borderColor: "var(--border)" }}>
      {!embedded && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">坐标视图</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1 rounded border"
              style={{ borderColor: "var(--border)" }}
            >
              关闭
            </button>
          )}
        </div>
      )}
      <svg
        width={embedded ? "100%" : SIZE}
        height={embedded ? "100%" : SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={embedded ? "flex-1 min-h-0 w-full" : undefined}
        preserveAspectRatio="xMidYMid meet"
        style={{ color: "var(--fg)" }}
      >
        <line x1={PAD} y1={originY} x2={SIZE - PAD} y2={originY} stroke="var(--border)" strokeWidth={1} />
        <line x1={originX} y1={PAD} x2={originX} y2={SIZE - PAD} stroke="var(--border)" strokeWidth={1} />
        <text x={SIZE - PAD} y={originY - 6} textAnchor="end" fontSize={10} fill="var(--muted)">
          紧急 →
        </text>
        <text x={originX + 4} y={PAD + 10} fontSize={10} fill="var(--muted)">
          ↑ 重要
        </text>
        <circle cx={originX} cy={originY} r={3} fill="var(--muted)" />
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
      {hover && (
        <div
          className="fixed z-50 rounded border shadow-lg p-2 text-xs max-w-[200px] max-h-[160px] overflow-y-auto pointer-events-none"
          style={{
            background: "var(--panel)",
            borderColor: "var(--border)",
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <ul className="space-y-0.5">
            {hover.cards.slice(0, TOOLTIP_MAX).map((c) => (
              <li key={c.id} className="truncate">
                {c.title}
              </li>
            ))}
            {hover.cards.length > TOOLTIP_MAX && (
              <li style={{ color: "var(--muted)" }}>+{hover.cards.length - TOOLTIP_MAX}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  if (embedded) return plot;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      {plot}
    </div>
  );
}
