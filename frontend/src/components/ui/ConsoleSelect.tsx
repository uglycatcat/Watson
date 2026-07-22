import { useEffect, useId, useRef, useState } from "react";

export interface ConsoleSelectOption {
  value: string;
  label: string;
}

interface ConsoleSelectProps {
  /** Short uppercase label shown above/inside the trigger, e.g. "CATEGORY". */
  label: string;
  value: string;
  options: ConsoleSelectOption[];
  onChange: (value: string) => void;
  /** Label for the empty/"all" option (value ""). */
  allLabel?: string;
  className?: string;
}

/**
 * Mission-control style dropdown. Replaces the bare native <select> with a
 * capsule trigger, animated popover, glowing hover states and a checked accent.
 * Fully keyboard accessible; closes on outside click / Escape.
 */
export function ConsoleSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "ALL",
  className = "",
}: ConsoleSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const allOptions: ConsoleSelectOption[] = [{ value: "", label: allLabel }, ...options];
  const selected = allOptions.find((o) => o.value === value) ?? allOptions[0];
  const isActive = value !== "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = allOptions.findIndex((o) => o.value === value);
      setActiveIndex(idx < 0 ? 0 : idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        commit(allOptions[activeIndex]?.value ?? "");
      }
    } else if (e.key === "ArrowDown" && open) {
      setActiveIndex((i) => Math.min(allOptions.length - 1, i + 1));
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    }
  };

  return (
    <div ref={rootRef} className={`console-select ${className}`}>
      <button
        type="button"
        className={`console-select__trigger ${isActive ? "is-active" : ""} ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className="console-select__label">{label}</span>
        <span className="console-select__value">{selected.label}</span>
        <svg
          className="console-select__chevron"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="console-select__panel" role="listbox" id={listboxId} tabIndex={-1}>
          {allOptions.map((opt, i) => {
            const isSel = opt.value === value;
            return (
              <li
                key={opt.value || "__all"}
                role="option"
                aria-selected={isSel}
                className={`console-select__option ${isSel ? "is-selected" : ""} ${i === activeIndex ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(opt.value)}
              >
                <span className="console-select__tick" aria-hidden>
                  {isSel ? "▸" : ""}
                </span>
                <span className="console-select__opt-label">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
