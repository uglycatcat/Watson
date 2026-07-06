import { useEffect, useRef } from "react";
import type { ScheduleCard } from "../../lib/api";
import { hasMoreResults, searchTitles } from "./titleSearch";

interface GlobalSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  cards: ScheduleCard[];
  onSelect: (card: ScheduleCard) => void;
  onFocusChange?: (focused: boolean) => void;
  open: boolean;
}

export function GlobalSearch({
  query,
  onQueryChange,
  cards,
  onSelect,
  onFocusChange,
  open,
}: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchTitles(cards, query);
  const showDropdown = open && query.trim().length > 0;
  const more = hasMoreResults(cards, query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onQueryChange("");
        onFocusChange?.(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQueryChange, onFocusChange]);

  return (
    <div className="relative flex-1 max-w-md">
      <input
        ref={inputRef}
        type="search"
        placeholder="搜索日程标题…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => setTimeout(() => onFocusChange?.(false), 150)}
        className="w-full text-sm px-3 py-1.5 rounded border"
        style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
      />
      {showDropdown && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 rounded border shadow-lg overflow-hidden"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm" style={{ color: "var(--muted)" }}>
              无匹配结果
            </li>
          ) : (
            <>
              {results.map(({ card }) => (
                <li key={card.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                    style={{ color: "var(--fg)" }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(card);
                      onQueryChange("");
                      onFocusChange?.(false);
                    }}
                  >
                    {card.title}
                  </button>
                </li>
              ))}
              {more && (
                <li className="px-3 py-1.5 text-xs border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
                  继续输入以收窄结果
                </li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
