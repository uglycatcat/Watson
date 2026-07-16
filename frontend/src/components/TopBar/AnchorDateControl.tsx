interface AnchorDateControlProps {
  value: string;
  onChange: (d: string) => void;
}

/** Non-clearable date picker for the shared anchor date. */
export function AnchorDateControl({ value, onChange }: AnchorDateControlProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        onChange(next);
      }}
      required
      className="text-sm px-2 py-1 rounded border shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
      aria-label="锚定日期"
    />
  );
}
