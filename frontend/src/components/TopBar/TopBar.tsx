import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../hooks/useTheme";
import { useCardMutations } from "../../hooks/useCardMutations";
import type { ViewMode } from "../ScheduleViews/ScheduleViewRouter";
import { GlobalSearch } from "../search/GlobalSearch";
import { api, type ScheduleCard } from "../../lib/api";
import { AnchorDateControl } from "./AnchorDateControl";
import { SegmentedControl } from "../ui/SegmentedControl";
import { getDragCardId, isCardDrag } from "../dnd/dragTrash";

const TOOL_BTN =
  "transition-interactive text-sm h-9 border shrink-0 inline-flex items-center justify-center shell-btn";

const TOOL_BTN_STYLE = {
  borderRadius: "var(--radius-md)",
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
  const [dropAccepted, setDropAccepted] = useState(false);
  const viewBeforeTrash = useRef<Exclude<ViewMode, "trash">>("day");

  // Live telemetry: count of active cards for the HUD readout.
  const { data: activeData } = useQuery({
    queryKey: ["cards", "all", { view: "all" }],
    queryFn: () => api.getCards({ view: "all" }),
  });
  const activeCount = activeData?.items?.length ?? 0;

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
      className="app-shell-topbar h-16 grid items-center gap-3 px-5 border-b shrink-0 relative z-[1]"
      style={{
        borderColor: "var(--border)",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
      }}
    >
      {/* Left: brand + telemetry + search + create */}
      <div className="flex items-center gap-3 min-w-0 justify-self-start">
        <span
          className="shrink-0 inline-flex items-center gap-2.5 select-none"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span className="hud-brand-mark" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M7 10h10M8 14h3M8 17h6" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span
              style={{
                fontWeight: "var(--font-semibold)",
                letterSpacing: "0.18em",
                fontSize: "0.95rem",
                color: "var(--fg-strong)",
              }}
            >
              WATSON
            </span>
            <span
              className="max-sm:hidden"
              style={{
                fontSize: "8px",
                letterSpacing: "0.24em",
                color: "var(--muted)",
                marginTop: "3px",
              }}
            >
              PERSONAL OPS
            </span>
          </span>
        </span>

        <div className="hud-telemetry max-lg:hidden" aria-hidden>
          <span className="hud-telemetry__dot" />
          <span className="hud-telemetry__num">{String(activeCount).padStart(2, "0")}</span>
          <span className="hud-telemetry__unit">ACTIVE</span>
        </div>

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
            className={`${TOOL_BTN} w-9 font-bold btn-accent-ghost`}
            style={{ ...TOOL_BTN_STYLE, borderColor: "var(--border)" }}
            title="新建日程"
          >
            +
          </button>
        )}
      </div>

      {/* True horizontal center: view segment only */}
      <div className="justify-self-center">
        {onViewChange && (
          <SegmentedControl
            value={segmentValue}
            options={SEGMENT_OPTIONS}
            onChange={(id) => onViewChange(id as ViewMode)}
          />
        )}
      </div>

      {/* Right: calendar stays just after the center lane; tools flush end */}
      <div className="flex items-center gap-2 min-w-0 justify-self-stretch">
        {anchorDate && onDateChange && (
          <AnchorDateControl value={anchorDate} onChange={onDateChange} />
        )}
        <span className="flex-1 min-w-0" aria-hidden />
        {dropError && (
          <span
            className="text-xs shrink-0 max-w-[160px] truncate"
            style={{ color: "var(--tele-critical)", fontFamily: "var(--font-mono)" }}
            title={dropError}
          >
            {dropError}
          </span>
        )}
        <div
          className="flex items-center gap-1 pr-3 mr-1 shrink-0"
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
                setDropAccepted(true);
                window.setTimeout(() => setDropAccepted(false), 350);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "删除失败";
                setDropError(msg);
                window.setTimeout(() => setDropError(null), 4000);
              }
            }}
            className={`${TOOL_BTN} w-9 trash-drop-target ${view === "trash" ? "btn-accent" : ""} ${dragOverTrash ? "is-drag-over" : ""} ${dropAccepted ? "is-accepted" : ""}`}
            style={{
              ...TOOL_BTN_STYLE,
              borderColor: dragOverTrash || view === "trash" ? "var(--accent)" : "var(--border)",
              background:
                view === "trash"
                  ? "var(--accent)"
                  : dragOverTrash
                    ? "var(--accent-subtle)"
                    : undefined,
              color: view === "trash" ? "#05070a" : "var(--fg)",
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
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className={`${TOOL_BTN} px-3`}
            style={{ ...TOOL_BTN_STYLE, borderColor: "var(--border)", letterSpacing: "0.08em" }}
            title="切换主题"
          >
            {theme === "console" ? "CONSOLE" : "SPACEX"}
          </button>
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              className={`${TOOL_BTN} px-3 ${chatOpen ? "btn-accent" : ""}`}
              style={{
                ...TOOL_BTN_STYLE,
                borderColor: chatOpen ? "var(--accent)" : "var(--border)",
                background: chatOpen ? "var(--accent)" : undefined,
                color: chatOpen ? "#05070a" : "var(--fg)",
                letterSpacing: "0.1em",
                fontWeight: "var(--font-semibold)",
              }}
              title="AI 指挥台"
            >
              AI
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
