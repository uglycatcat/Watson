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
    queryKey: ["cards", "all", { view: "all" }],
    queryFn: () => api.getCards({ view: "all" }),
  });
  const { data: trashCardsData } = useQuery({
    queryKey: ["cards", "trash"],
    queryFn: () => api.getCards({ view: "trash" }),
  });
  const searchCards = [...(allCardsData?.items ?? []), ...(trashCardsData?.items ?? [])];

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
        onDateChange={(d) => {
          if (d) setAnchorDate(d);
        }}
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
        <main
          className="relative flex-1 min-w-[320px] min-h-0 flex flex-col overflow-hidden"
          style={{ background: "var(--bg)", padding: "var(--space-4)" }}
        >
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <ScheduleViewRouter
              view={view}
              anchorDate={anchorDate}
              onDateChange={(d) => {
                if (d) setAnchorDate(d);
              }}
              onCardClick={setSelectedCard}
              onCreateClick={() => setCreateOpen(true)}
              onLeaveTrash={() => setView("day")}
            />
          </div>
          {searchFocused && (
            <div
              className="absolute inset-0 z-10 pointer-events-none transition-interactive"
              style={{ background: "rgba(0,0,0,0.35)" }}
              aria-hidden
            />
          )}
        </main>
        <aside
          className="border-l flex flex-col shrink-0 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:shadow-xl max-md:w-full transition-interactive overflow-hidden"
          style={{
            width: chatOpen ? width : 0,
            maxWidth: chatOpen ? "100%" : 0,
            opacity: chatOpen ? 1 : 0,
            background: "var(--panel)",
            borderColor: "var(--border)",
            transitionDuration: "var(--duration-normal)",
            pointerEvents: chatOpen ? "auto" : "none",
          }}
        >
          {chatOpen && (
            <>
              <ResizeHandle onPointerDown={onResizeStart} />
              <ChatPanel />
            </>
          )}
        </aside>
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
