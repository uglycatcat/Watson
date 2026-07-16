import { useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useCardMutations } from "../../hooks/useCardMutations";
import type { ViewMode } from "../ScheduleViews/ScheduleViewRouter";
import { GlobalSearch } from "../search/GlobalSearch";
import type { ScheduleCard } from "../../lib/api";
import { AnchorDateControl } from "./AnchorDateControl";
import { getDragCardId, isCardDrag } from "../dnd/dragTrash";

/** Shared height with 浅色 / AI; trash uses same height as a square */
const TOOL_BTN =
  "text-sm h-8 rounded border shrink-0 inline-flex items-center justify-center";

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
  const { deleteCard } = useCardMutations();
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const viewBeforeTrash = useRef<Exclude<ViewMode, "trash">>("day");

  const toggleTrash = () => {
    if (!onViewChange) return;
    if (view === "trash") {
      onViewChange(viewBeforeTrash.current);
      return;
    }
    viewBeforeTrash.current = view;
    onViewChange("trash");
  };

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
      {anchorDate && onDateChange && (
        <AnchorDateControl value={anchorDate} onChange={onDateChange} />
      )}
      <div className="flex-1" />
      {dropError && (
        <span className="text-xs text-red-600 shrink-0 max-w-[160px] truncate" title={dropError}>
          {dropError}
        </span>
      )}
      <button
        type="button"
        onClick={toggleTrash}
        onDragEnter={(e) => {
          if (!isCardDrag(e.dataTransfer)) return;
          e.preventDefault();
          setDragOverTrash(true);
        }}
        onDragOver={(e) => {
          if (!isCardDrag(e.dataTransfer)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverTrash(true);
        }}
        onDragLeave={() => setDragOverTrash(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOverTrash(false);
          const id = getDragCardId(e.dataTransfer);
          if (!id) return;
          setDropError(null);
          try {
            await deleteCard(id);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "删除失败";
            setDropError(msg);
            window.setTimeout(() => setDropError(null), 4000);
          }
        }}
        className={`${TOOL_BTN} w-8`}
        style={{
          borderColor: dragOverTrash ? "var(--accent)" : "var(--border)",
          background:
            view === "trash"
              ? "var(--accent)"
              : dragOverTrash
                ? "color-mix(in srgb, var(--accent) 25%, transparent)"
                : "transparent",
          color: view === "trash" ? "#fff" : "var(--fg)",
          outline: dragOverTrash ? "2px solid var(--accent)" : undefined,
        }}
        title="垃圾箱（桌面可拖入删除；再点退出）"
        aria-label="垃圾箱"
        aria-pressed={view === "trash"}
      >
        🗑
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className={`${TOOL_BTN} px-2`}
        style={{ borderColor: "var(--border)" }}
      >
        {theme === "dark" ? "深色" : "浅色"}
      </button>
      {onToggleChat && (
        <button
          type="button"
          onClick={onToggleChat}
          className={`${TOOL_BTN} px-2`}
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
