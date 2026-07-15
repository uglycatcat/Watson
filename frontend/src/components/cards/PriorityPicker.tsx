import { useEffect, useRef, useState } from "react";

interface PriorityPickerProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}

export function PriorityPicker({ label, value, onChange, onClose }: PriorityPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded border shadow-lg py-1 px-1 flex flex-col-reverse"
      style={{ background: "var(--panel)", borderColor: "var(--border)", minWidth: 48 }}
    >
      <div className="text-[10px] text-center px-1 pb-1" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      {Array.from({ length: 11 }, (_, i) => i).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => {
            onChange(n);
            onClose();
          }}
          className="w-full text-center text-sm py-0.5 rounded"
          style={{
            background: value === n ? "var(--accent)" : "transparent",
            color: value === n ? "#fff" : "var(--fg)",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

interface PriorityFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function PriorityField({ label, value, onChange, disabled }: PriorityFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <label className="block relative">
      <span className="text-[var(--muted)]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="w-full px-2 py-1.5 rounded border text-sm text-left"
        style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-1">
          <PriorityPicker
            label={label}
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </label>
  );
}
