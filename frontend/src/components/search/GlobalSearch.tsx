import { useEffect, useRef } from "react";
import type { ScheduleCard } from "../../lib/api";
import { hasMoreResults, searchTitles, trashStatusLabel } from "./titleSearch";
import { EmptyState } from "../ui/EmptyState";

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
    <div
      className="relative shrink-0 transition-interactive w-[200px] focus-within:w-[min(100%,280px)]"
      style={{ transitionProperty: "width" }}
    >
      <input
        ref={inputRef}
        type="search"
        placeholder="搜索日程标题…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => setTimeout(() => onFocusChange?.(false), 150)}
        className="w-full text-sm px-3 py-1.5 rounded-md border transition-interactive"
        style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
      />
      {showDropdown && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 rounded-md border overflow-hidden"
          style={{ background: "var(--panel)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
        >
          {results.length === 0 ? (
            <li>
              <EmptyState
                compact
                icon="🔍"
                title="没有匹配的日程"
                description="试试其他关键词"
                action={{ label: "清空搜索", onClick: () => onQueryChange("") }}
              />
            </li>
          ) : (
            <>
              {results.map(({ card }) => {
                const label = trashStatusLabel(card);
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm transition-interactive flex items-center gap-2 hover:bg-[var(--accent-subtle)]"
                      style={{ color: "var(--fg)" }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelect(card);
                        onQueryChange("");
                        onFocusChange?.(false);
                      }}
                    >
                      <span className="truncate flex-1">{card.title}</span>
                      {label && (
                        <span className="text-[10px] shrink-0 px-1 rounded" style={{ color: "var(--muted)" }}>
                          {label}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
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
