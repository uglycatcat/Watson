import { useState } from "react";
import { TopBar } from "../components/TopBar/TopBar";
import { ScheduleViewRouter, todayStr, type ViewMode } from "../components/ScheduleViews/ScheduleViewRouter";
import { ChatPanel } from "../components/ChatPanel/ChatPanel";
import { useVisibilitySync } from "../hooks/useVisibilitySync";

export function AppShell() {
  const [chatOpen, setChatOpen] = useState(true);
  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState(todayStr());

  useVisibilitySync(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        view={view}
        onViewChange={setView}
        anchorDate={anchorDate}
        onDateChange={setAnchorDate}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />
      <div className="flex flex-1 min-h-0 relative">
        <main className="flex-1 min-w-0 overflow-auto p-4" style={{ background: "var(--bg)" }}>
          <ScheduleViewRouter view={view} anchorDate={anchorDate} />
        </main>
        {chatOpen && (
          <aside
            className="w-full md:w-96 border-l flex flex-col shrink-0 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:shadow-xl"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <ChatPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
