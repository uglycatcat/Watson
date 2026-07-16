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
  return (
    <div
      className={`inline-flex p-0.5 gap-0.5 rounded-md ${className}`}
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      role="tablist"
    >
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className="transition-interactive px-2.5 py-1 text-sm rounded-sm segment-tab"
            style={{
              background: selected ? "var(--accent-subtle)" : "transparent",
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
