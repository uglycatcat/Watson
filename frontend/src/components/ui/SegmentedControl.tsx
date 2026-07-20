interface SegmentedOption {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  value: string;
  options: SegmentedOption[];
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({ value, options, onChange, className = "" }: SegmentedControlProps) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));
  return (
    <div
      className={`segmented-control inline-grid p-0.5 rounded-md ${className}`}
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        "--segment-index": selectedIndex,
        "--segment-count": options.length,
      } as React.CSSProperties}
      role="tablist"
    >
      <span className="segment-indicator" aria-hidden />
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className="relative z-10 transition-interactive px-2.5 py-1 text-sm rounded-sm segment-tab"
            style={{
              background: "transparent",
              color: selected ? "var(--accent)" : "var(--fg)",
              fontWeight: selected ? "var(--font-medium)" : "var(--font-normal)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
