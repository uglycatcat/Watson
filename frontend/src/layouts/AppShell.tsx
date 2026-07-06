import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleCard } from "../lib/api";
import { api } from "../lib/api";
import { TopBar } from "../components/TopBar/TopBar";
import { ScheduleViewRouter, useTodayStr, type ViewMode } from "../components/ScheduleViews/ScheduleViewRouter";
import { ChatPanel } from "../components/ChatPanel/ChatPanel";
import { useVisibilitySync } from "../hooks/useVisibilitySync";
import { useChatPanelLayout } from "../hooks/useChatPanelLayout";
import { ResizeHandle } from "../components/ui/ResizeHandle";
import { CardDetailModal } from "../components/cards/CardDetailModal";
import { CreateCardModal } from "../components/cards/CreateCardModal";

export function AppShell() {
  const { chatOpen, toggleChat, width, onResizeStart, dragging } = useChatPanelLayout();
  const today = useTodayStr();
  const prevTodayRef = useRef(today);
  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedCard, setSelectedCard] = useState<ScheduleCard | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allCardsData } = useQuery({
    queryKey: ["cards", "all", { view: "all", sort: "title" }],
    queryFn: () => api.getCards({ view: "all", sort: "title" }),
  });
  const searchCards = allCardsData?.items ?? [];

  useEffect(() => {
    if (anchorDate === prevTodayRef.current) {
      setAnchorDate(today);
    }
    prevTodayRef.current = today;
  }, [today, anchorDate]);

  useVisibilitySync(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        view={view}
        onViewChange={(v) => {
          setSearchFocused(false);
          setSearchQuery("");
          setView(v);
        }}
        anchorDate={anchorDate}
        onDateChange={setAnchorDate}
        onToggleChat={toggleChat}
        chatOpen={chatOpen}
        onCreateClick={() => setCreateOpen(true)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchFocused={searchFocused}
        onSearchFocusChange={setSearchFocused}
        searchCards={searchCards}
        onSearchSelect={setSelectedCard}
      />
      <div className={`flex flex-1 min-h-0 relative ${dragging ? "select-none" : ""}`}>
        <main className="relative flex-1 min-w-[320px] min-h-0 flex flex-col overflow-hidden p-4" style={{ background: "var(--bg)" }}>
          <div className="relative flex-1 min-h-0 overflow-auto">
            <ScheduleViewRouter
              view={view}
              anchorDate={anchorDate}
              onDateChange={setAnchorDate}
              onCardClick={setSelectedCard}
            />
          </div>
          {searchFocused && (
            <div
              className="absolute inset-0 z-10 pointer-events-none transition-opacity"
              style={{ background: "rgba(0,0,0,0.35)" }}
              aria-hidden
            />
          )}
        </main>
        {chatOpen && (
          <>
            <ResizeHandle onPointerDown={onResizeStart} />
            <aside
              className="border-l flex flex-col shrink-0 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:shadow-xl max-md:w-full"
              style={{
                width: width,
                maxWidth: "100%",
                background: "var(--panel)",
                borderColor: "var(--border)",
              }}
            >
              <ChatPanel />
            </aside>
          </>
        )}
      </div>
      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdated={setSelectedCard}
      />
      <CreateCardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
