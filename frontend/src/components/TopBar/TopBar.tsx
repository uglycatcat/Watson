import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import type { ViewMode } from "../ScheduleViews/ScheduleViewRouter";

interface TopBarProps {
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  anchorDate?: string;
  onDateChange?: (d: string) => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export function TopBar({
  view = "day",
  onViewChange,
  anchorDate,
  onDateChange,
  onToggleChat,
  chatOpen,
}: TopBarProps) {
  const { logout } = useAuth();
  const { theme, cycleTheme } = useTheme();

  return (
    <header
      className="h-14 flex items-center gap-3 px-4 border-b shrink-0"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <span className="font-semibold mr-2">Watson</span>
      {onViewChange && (
        <nav className="flex gap-1 text-sm">
          {(["day", "week", "month", "all"] as ViewMode[]).map((v) => (
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
              {{ day: "日", week: "周", month: "月", all: "全部" }[v]}
            </button>
          ))}
        </nav>
      )}
      {anchorDate && onDateChange && view !== "all" && (
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="text-sm px-2 py-1 rounded border ml-2"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)" }}
        />
      )}
      <div className="flex-1" />
      <button type="button" onClick={cycleTheme} className="text-sm px-2 py-1 rounded border" style={{ borderColor: "var(--border)" }}>
        主题: {theme}
      </button>
      {onToggleChat && (
        <button type="button" onClick={onToggleChat} className="md:hidden text-sm px-2 py-1 rounded border" style={{ borderColor: "var(--border)" }}>
          {chatOpen ? "隐藏聊天" : "聊天"}
        </button>
      )}
      <button type="button" onClick={() => logout()} className="text-sm px-2 py-1 rounded border" style={{ borderColor: "var(--border)" }}>
        登出
      </button>
    </header>
  );
}
