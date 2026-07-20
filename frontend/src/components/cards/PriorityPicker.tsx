import { PriorityMeter } from "./PriorityMeter";

interface PriorityPickerProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function PriorityPicker({ label, value, onChange, disabled }: PriorityPickerProps) {
  const safeValue = Math.max(0, Math.min(10, Math.round(value)));
  return (
    <div className="priority-range-wrap">
      <output className="priority-range-value" style={{ left: `${safeValue * 10}%` }}>
        {safeValue}
      </output>
      <input
        aria-label={label}
        className="priority-range"
        type="range"
        min={0}
        max={10}
        step={1}
        value={safeValue}
        disabled={disabled}
        style={{ "--priority-progress": `${safeValue * 10}%` } as React.CSSProperties}
        onChange={(event) => onChange(Math.round(Number(event.target.value)))}
      />
      <div className="priority-range-ticks" aria-hidden>
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

interface PriorityFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function meterLabel(label: string): "重要" | "紧急" {
  return label.includes("紧急") ? "紧急" : "重要";
}

export function PriorityField({ label, value, onChange, disabled }: PriorityFieldProps) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {disabled ? (
        <PriorityMeter label={meterLabel(label)} value={value} showNumber={false} />
      ) : (
        <PriorityPicker label={label} value={value} onChange={onChange} />
      )}
    </label>
  );
}
