interface PriorityMeterProps {
  label: "重要" | "紧急";
  value: number;
  showNumber?: boolean;
  compact?: boolean;
}

function fillColor(value: number): string {
  const t = Math.max(0, Math.min(10, value)) / 10;
  if (t <= 0.33) {
    return `color-mix(in srgb, var(--muted) ${Math.round(70 - t * 30)}%, var(--accent) ${Math.round(t * 30)}%)`;
  }
  if (t <= 0.66) {
    return `color-mix(in srgb, var(--muted) ${Math.round(40 - (t - 0.33) * 40)}%, var(--accent) ${Math.round(33 + (t - 0.33) * 40)}%)`;
  }
  return `color-mix(in srgb, var(--accent) ${Math.round(70 + (t - 0.66) * 30)}%, var(--fg-strong) ${Math.round((t - 0.66) * 20)}%)`;
}

export function PriorityMeter({ label, value, showNumber = true, compact = false }: PriorityMeterProps) {
  const clamped = Math.max(0, Math.min(10, value));
  const pct = ((clamped + 1) / 11) * 100;

  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${compact ? "text-[10px]" : "text-xs"}`}>
      <span className="shrink-0 w-6" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div
        className="flex-1 min-w-[48px] h-1.5 rounded-full overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--border) 60%, transparent)" }}
        role="meter"
        aria-label={`${label} ${clamped}`}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={10}
      >
        <div
          className="h-full rounded-full transition-interactive"
          style={{ width: `${pct}%`, background: fillColor(clamped) }}
        />
      </div>
      {showNumber && (
        <span className="shrink-0 tabular-nums w-4 text-right" style={{ color: "var(--muted)" }}>
          {clamped}
        </span>
      )}
    </div>
  );
}
