import { useEffect, useId, useMemo, useRef, useState } from "react";
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
const PAD = 52;
const PLOT = SIZE - PAD * 2;
const MAX_RADIUS = 20;
const MIN_RADIUS = 7;
const TOOLTIP_MAX = 5;
const GRID_STEPS = 10; // one line per priority unit

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

/** Quadrant colour by (urgency, importance) — telemetry palette. */
function blipTone(urgency: number, importance: number): string {
  const hi = 5;
  if (importance >= hi && urgency >= hi) return "var(--tele-critical)"; // 立即做
  if (importance >= hi && urgency < hi) return "var(--tele-caution)"; // 计划做
  if (importance < hi && urgency >= hi) return "var(--tele-info)"; // 授权做(紧急不重要)
  return "var(--tele-nominal)"; // 减少做
}

export function QuadrantView({ cards, onClose, variant = "overlay", onHoverCardIds }: QuadrantViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const clipId = `clip-${uid}`;
  const glowId = `glow-${uid}`;
  const scanId = `scan-${uid}`;
  const [hover, setHover] = useState<Bucket | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const embedded = variant === "embedded";

  useEffect(() => {
    if (embedded || !onClose) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, embedded]);

  const buckets = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const card of cards) {
      if (card.kind === "parent") continue;
      const key = `${card.urgency},${card.importance}`;
      const existing = map.get(key);
      if (existing) existing.cards.push(card);
      else map.set(key, { urgency: card.urgency, importance: card.importance, cards: [card] });
    }
    return Array.from(map.values());
  }, [cards]);

  const maxCount = useMemo(() => Math.max(1, ...buckets.map((b) => b.cards.length)), [buckets]);
  const totalPlotted = useMemo(() => buckets.reduce((s, b) => s + b.cards.length, 0), [buckets]);

  const originX = xPos(5);
  const originY = yPos(5);

  const gridLines = [];
  for (let i = 1; i < GRID_STEPS; i++) {
    const gx = PAD + (i / GRID_STEPS) * PLOT;
    const gy = PAD + (i / GRID_STEPS) * PLOT;
    gridLines.push(
      <line key={`vx-${i}`} x1={gx} y1={PAD} x2={gx} y2={PAD + PLOT} stroke="var(--grid-line)" strokeWidth={1} />,
      <line key={`hz-${i}`} x1={PAD} y1={gy} x2={PAD + PLOT} y2={gy} stroke="var(--grid-line)" strokeWidth={1} />,
    );
  }

  const svg = (
    <svg
      width={embedded ? "100%" : SIZE}
      height={embedded ? "100%" : SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={embedded ? "flex-1 min-h-0 w-full h-full" : undefined}
      preserveAspectRatio={embedded ? "none" : "xMidYMid meet"}
      style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={PAD} y={PAD} width={PLOT} height={PLOT} rx={14} ry={14} />
        </clipPath>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={scanId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.10" />
          <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.03" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* plot frame */}
      <rect
        x={PAD}
        y={PAD}
        width={PLOT}
        height={PLOT}
        rx={14}
        fill="var(--bg)"
        stroke="var(--border-strong)"
        strokeWidth={1}
      />

      <g clipPath={`url(#${clipId})`}>
        {/* quadrant tints: Q1 top-right 立即做, Q2 top-left 计划做, Q3 bottom-left 减少做, Q4 bottom-right 授权做 */}
        <rect x={originX} y={PAD} width={SIZE - PAD - originX} height={originY - PAD} fill="var(--tele-critical)" opacity={0.07} />
        <rect x={PAD} y={PAD} width={originX - PAD} height={originY - PAD} fill="var(--tele-caution)" opacity={0.06} />
        <rect x={PAD} y={originY} width={originX - PAD} height={SIZE - PAD - originY} fill="var(--tele-nominal)" opacity={0.05} />
        <rect x={originX} y={originY} width={SIZE - PAD - originX} height={SIZE - PAD - originY} fill="var(--tele-info)" opacity={0.06} />

        {/* telemetry grid */}
        {gridLines}

        {/* radar scan glow around origin */}
        <circle cx={originX} cy={originY} r={PLOT * 0.42} fill={`url(#${scanId})`} />
        <circle cx={originX} cy={originY} r={PLOT * 0.24} fill="none" stroke="var(--accent)" strokeOpacity={0.14} strokeWidth={1} strokeDasharray="2 5" />
        <circle cx={originX} cy={originY} r={PLOT * 0.4} fill="none" stroke="var(--accent)" strokeOpacity={0.1} strokeWidth={1} strokeDasharray="2 5" />

        {/* axes */}
        <line x1={PAD} y1={originY} x2={SIZE - PAD} y2={originY} stroke="var(--accent)" strokeWidth={1.4} opacity={0.4} />
        <line x1={originX} y1={PAD} x2={originX} y2={SIZE - PAD} stroke="var(--accent)" strokeWidth={1.4} opacity={0.4} />

        {/* crosshair origin */}
        <g>
          <circle cx={originX} cy={originY} r={9} fill="none" stroke="var(--accent)" strokeWidth={1.4} opacity={0.9} />
          <line x1={originX - 14} y1={originY} x2={originX - 4} y2={originY} stroke="var(--accent)" strokeWidth={1.4} />
          <line x1={originX + 4} y1={originY} x2={originX + 14} y2={originY} stroke="var(--accent)" strokeWidth={1.4} />
          <line x1={originX} y1={originY - 14} x2={originX} y2={originY - 4} stroke="var(--accent)" strokeWidth={1.4} />
          <line x1={originX} y1={originY + 4} x2={originX} y2={originY + 14} stroke="var(--accent)" strokeWidth={1.4} />
          <circle cx={originX} cy={originY} r={2} fill="var(--accent)" />
        </g>

        {/* blips */}
        {buckets.map((b) => {
          const cx = xPos(b.urgency);
          const cy = yPos(b.importance);
          const r = radiusForCount(b.cards.length, maxCount);
          const tone = blipTone(b.urgency, b.importance);
          const isHot = hover === b;
          const hitR = Math.max(r + 10, MAX_RADIUS + 6);
          return (
            <g
              key={`${b.urgency}-${b.importance}`}
              className={`radar-blip ${isHot ? "is-hot" : ""}`}
              onMouseEnter={(e) => {
                setHover(b);
                onHoverCardIds?.(new Set(b.cards.map((card) => card.id)));
                const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => {
                setHover(null);
                onHoverCardIds?.(new Set());
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: "pointer" }}
            >
              {/* Stable hit target — size does not change on hover */}
              <circle className="radar-blip__hit" cx={cx} cy={cy} r={hitR} />
              <g className="radar-blip__viz">
                <circle className="radar-blip__ring" cx={cx} cy={cy} r={r + 5} fill={tone} opacity={0.12} />
                <circle className="radar-blip__core" cx={cx} cy={cy} r={r} fill={tone} opacity={0.92} filter={`url(#${glowId})`} />
                {b.cards.length > 1 && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="var(--on-accent)">
                    {b.cards.length}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </g>

      {/* quadrant labels — shown in both modes (corner-anchored) */}
      {(() => {
        const fs = embedded ? 15 : 12;
        const ls = embedded ? 1 : 2;
        const inset = embedded ? 10 : 14;
        return (
          <>
            <text x={SIZE - PAD - inset} y={PAD + fs + 2} textAnchor="end" fontSize={fs} letterSpacing={ls} fill="var(--tele-critical)" opacity={0.85}>立即做</text>
            <text x={PAD + inset} y={PAD + fs + 2} textAnchor="start" fontSize={fs} letterSpacing={ls} fill="var(--tele-caution)" opacity={0.85}>计划做</text>
            <text x={PAD + inset} y={SIZE - PAD - inset} textAnchor="start" fontSize={fs} letterSpacing={ls} fill="var(--tele-nominal)" opacity={0.85}>减少做</text>
            <text x={SIZE - PAD - inset} y={SIZE - PAD - inset} textAnchor="end" fontSize={fs} letterSpacing={ls} fill="var(--tele-info)" opacity={0.85}>授权做</text>
          </>
        );
      })()}
      {/* axis labels */}
      <text x={SIZE - PAD} y={originY - 10} textAnchor="end" fontSize={embedded ? 16 : 12} letterSpacing={1.5} fill="var(--muted)">紧急度 →</text>
      <text x={originX + 12} y={PAD + (embedded ? 18 : 14)} fontSize={embedded ? 16 : 12} letterSpacing={1.5} fill="var(--muted)">↑ 重要度</text>
    </svg>
  );

  const plot = (
    <div
      ref={ref}
      className={embedded ? "w-full h-full flex flex-col min-h-0 relative" : "radar-panel"}
    >
      {!embedded && (
        <div className="radar-panel__head">
          <div className="radar-panel__title">
            <span className="radar-panel__eyebrow">EISENHOWER MATRIX</span>
            <span className="radar-panel__name">任务象限雷达</span>
          </div>
          <div className="radar-panel__meta">
            <span className="radar-panel__count"><b>{totalPlotted}</b> 个目标</span>
            {onClose && (
              <button type="button" className="radar-panel__close" onClick={onClose} aria-label="关闭">×</button>
            )}
          </div>
        </div>
      )}
      <div className="relative flex-1 min-h-0">{svg}</div>
    </div>
  );

  const tooltip = hover
    ? createPortal(
        <div
          className="radar-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 10 }}
        >
          {hover.cards.slice(0, TOOLTIP_MAX).map((c) => (
            <div key={c.id} className="radar-tooltip__row">
              <div className="radar-tooltip__title">{c.title}</div>
              <PriorityMeter label="重要" value={c.importance} compact showNumber />
              <PriorityMeter label="紧急" value={c.urgency} compact showNumber />
            </div>
          ))}
          {hover.cards.length > TOOLTIP_MAX && (
            <p className="radar-tooltip__more">+{hover.cards.length - TOOLTIP_MAX} 更多</p>
          )}
        </div>,
        document.body,
      )
    : null;

  if (embedded) {
    return (
      <>
        {plot}
        {tooltip}
      </>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-backdrop-enter" style={{ background: "rgba(2,4,8,0.72)", backdropFilter: "blur(3px)" }} aria-hidden />
      {plot}
      {tooltip}
    </div>,
    document.body,
  );
}
