import { useTheme } from "../../hooks/useTheme";
import type { ViewMode } from "../ScheduleViews/ScheduleViewRouter";
import { GlobalSearch } from "../search/GlobalSearch";
import type { ScheduleCard } from "../../lib/api";

const NAV_VIEWS = ["day", "week", "month", "all"] as const;
const VIEW_LABELS: Record<(typeof NAV_VIEWS)[number], string> = {
  day: "日",
  week: "周",
  month: "月",
  all: "全部",
};

interface TopBarProps {
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  anchorDate?: string;
  onDateChange?: (d: string) => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  onCreateClick?: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  searchFocused?: boolean;
  onSearchFocusChange?: (focused: boolean) => void;
  searchCards?: ScheduleCard[];
  onSearchSelect?: (card: ScheduleCard) => void;
}

export function TopBar({
  view = "day",
  onViewChange,
  anchorDate,
  onDateChange,
  onToggleChat,
  chatOpen,
  onCreateClick,
  searchQuery = "",
  onSearchQueryChange,
  searchFocused = false,
  onSearchFocusChange,
  searchCards = [],
  onSearchSelect,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="h-14 flex items-center gap-3 px-4 border-b shrink-0"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <span className="font-semibold mr-1 shrink-0">Watson</span>
      {onSearchQueryChange && onSearchSelect && (
        <GlobalSearch
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          cards={searchCards}
          onSelect={onSearchSelect}
          onFocusChange={onSearchFocusChange}
          open={searchFocused}
        />
      )}
      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="text-sm w-8 h-8 rounded border font-bold shrink-0"
          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          title="新建日程"
        >
          +
        </button>
      )}
      {onViewChange && (
        <nav className="flex gap-1 text-sm shrink-0">
          {NAV_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className="px-2 py-1 rounded"
              style={{
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#fff" : "var(--fg)",
              }}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </nav>
      )}
      {anchorDate && onDateChange && view !== "all" && view !== "trash" && (
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="text-sm px-2 py-1 rounded border shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
        />
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onViewChange?.("trash")}
        className="text-sm w-8 h-8 rounded border shrink-0 flex items-center justify-center"
        style={{
          borderColor: "var(--border)",
          background: view === "trash" ? "var(--accent)" : "transparent",
          color: view === "trash" ? "#fff" : "var(--fg)",
        }}
        title="垃圾箱"
        aria-label="垃圾箱"
      >
        🗑
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="text-sm px-2 py-1 rounded border shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        {theme === "dark" ? "深色" : "浅色"}
      </button>
      {onToggleChat && (
        <button
          type="button"
          onClick={onToggleChat}
          className="text-sm px-2 py-1 rounded border shrink-0"
          style={{
            borderColor: "var(--border)",
            background: chatOpen ? "var(--accent)" : "var(--bg)",
            color: chatOpen ? "#fff" : "var(--fg)",
          }}
        >
          AI
        </button>
      )}
    </header>
  );
}
