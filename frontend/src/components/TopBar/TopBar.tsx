import { useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useCardMutations } from "../../hooks/useCardMutations";
import type { ViewMode } from "../ScheduleViews/ScheduleViewRouter";
import { GlobalSearch } from "../search/GlobalSearch";
import type { ScheduleCard } from "../../lib/api";
import { AnchorDateControl } from "./AnchorDateControl";
import { SegmentedControl } from "../ui/SegmentedControl";
import { getDragCardId, isCardDrag } from "../dnd/dragTrash";

const TOOL_BTN =
  "transition-interactive text-sm h-8 border shrink-0 inline-flex items-center justify-center shell-btn";

const TOOL_BTN_STYLE = {
  borderRadius: "var(--radius-md)",
  background: "var(--bg)",
} as const;

const NAV_VIEWS = ["day", "week", "month", "all"] as const;
const VIEW_LABELS: Record<(typeof NAV_VIEWS)[number], string> = {
  day: "日",
  week: "周",
  month: "月",
  all: "全部",
};

const SEGMENT_OPTIONS = NAV_VIEWS.map((v) => ({ id: v, label: VIEW_LABELS[v] }));

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

  const segmentValue = view === "trash" ? viewBeforeTrash.current : view;

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
      {/* Left: brand + search + create */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="font-semibold shrink-0" style={{ fontWeight: "var(--font-semibold)" }}>
          Watson
        </span>
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
            className={`${TOOL_BTN} w-8 font-bold btn-accent-ghost`}
            style={{ ...TOOL_BTN_STYLE, borderColor: "var(--border)" }}
            title="新建日程"
          >
            +
          </button>
        )}
      </div>

      {/* Center: segmented views + anchor date */}
      <div className="flex items-center gap-2 flex-1 justify-center min-w-0 flex-wrap">
        {onViewChange && (
          <SegmentedControl
            value={segmentValue}
            options={SEGMENT_OPTIONS}
            onChange={(id) => onViewChange(id as ViewMode)}
          />
        )}
        {anchorDate && onDateChange && view !== "trash" && (
          <AnchorDateControl value={anchorDate} onChange={onDateChange} />
        )}
      </div>

      {/* Right: trash | preferences */}
      <div className="flex items-center gap-2 shrink-0">
        {dropError && (
          <span className="text-xs text-red-600 shrink-0 max-w-[160px] truncate" title={dropError}>
            {dropError}
          </span>
        )}
        <div
          className="flex items-center gap-1 pr-2 mr-1"
          style={{ borderRight: "1px solid var(--border)" }}
        >
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
            className={`${TOOL_BTN} w-8 ${view === "trash" ? "btn-accent" : ""}`}
            style={{
              ...TOOL_BTN_STYLE,
              borderColor: dragOverTrash || view === "trash" ? "var(--accent)" : "var(--border)",
              background:
                view === "trash"
                  ? "var(--accent)"
                  : dragOverTrash
                    ? "var(--accent-subtle)"
                    : "var(--bg)",
              color: view === "trash" ? "#fff" : "var(--fg)",
              outline: dragOverTrash ? "2px solid var(--accent)" : undefined,
              transform: dragOverTrash ? "scale(1.08)" : undefined,
              boxShadow: dragOverTrash ? "var(--shadow-sm)" : undefined,
            }}
            title="垃圾箱（桌面可拖入删除；再点退出）"
            aria-label="垃圾箱"
            aria-pressed={view === "trash"}
          >
            🗑
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className={`${TOOL_BTN} px-2`}
            style={{ ...TOOL_BTN_STYLE, borderColor: "var(--border)" }}
          >
            {theme === "dark" ? "深色" : "浅色"}
          </button>
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              className={`${TOOL_BTN} px-2 ${chatOpen ? "btn-accent" : ""}`}
              style={{
                ...TOOL_BTN_STYLE,
                borderColor: chatOpen ? "var(--accent)" : "var(--border)",
                background: chatOpen ? "var(--accent)" : "var(--bg)",
                color: chatOpen ? "#fff" : "var(--fg)",
              }}
            >
              AI
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
