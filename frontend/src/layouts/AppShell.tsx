import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isParentCard, type ScheduleCard } from "../lib/api";
import { api } from "../lib/api";
import { TopBar } from "../components/TopBar/TopBar";
import { ScheduleViewRouter, useTodayStr, type ViewMode } from "../components/ScheduleViews/ScheduleViewRouter";
import { ChatPanel } from "../components/ChatPanel/ChatPanel";
import { useVisibilitySync } from "../hooks/useVisibilitySync";
import { useChatPanelLayout } from "../hooks/useChatPanelLayout";
import { ResizeHandle } from "../components/ui/ResizeHandle";
import { SpaceBackdrop } from "../components/ui/SpaceBackdrop";
import { CardDetailModal } from "../components/cards/CardDetailModal";
import { ParentCardDetailModal } from "../components/cards/ParentCardDetailModal";
import { CreateCardModal } from "../components/cards/CreateCardModal";

export function AppShell() {
  const { chatOpen, toggleChat, width, onResizeStart, dragging } = useChatPanelLayout();
  const today = useTodayStr();
  const prevTodayRef = useRef(today);
  const [view, setView] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedCard, setSelectedCard] = useState<ScheduleCard | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [returnToParentId, setReturnToParentId] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState<ScheduleCard[] | null>(null);
  const [composeSuccessAnim, setComposeSuccessAnim] = useState<{
    sourceIds: string[];
    targetId: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: allCardsData } = useQuery({
    queryKey: ["cards", "all", { view: "all" }],
    queryFn: () => api.getCards({ view: "all" }),
  });
  // Undated view=day returns every active standard, including parent members.
  const { data: activeStandardsData } = useQuery({
    queryKey: ["cards", "active-standards"],
    queryFn: () => api.getCards({ view: "day" }),
  });
  const { data: trashCardsData } = useQuery({
    queryKey: ["cards", "trash"],
    queryFn: () => api.getCards({ view: "trash" }),
  });
  const searchById = new Map<string, ScheduleCard>();
  for (const c of allCardsData?.items ?? []) searchById.set(c.id, c);
  for (const c of activeStandardsData?.items ?? []) searchById.set(c.id, c);
  for (const c of trashCardsData?.items ?? []) searchById.set(c.id, c);
  const searchCards = [...searchById.values()];
  const knownTitles = searchCards
    .filter((c) => c.status === "active")
    .map((c) => c.title);

  useEffect(() => {
    if (anchorDate === prevTodayRef.current) {
      setAnchorDate(today);
    }
    prevTodayRef.current = today;
  }, [today, anchorDate]);

  useVisibilitySync(true);

  const handleCardClick = (card: ScheduleCard) => {
    setReturnToParentId(null);
    setComposeDraft(null);
    if (isParentCard(card)) {
      setSelectedParentId(card.id);
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
      setSelectedParentId(null);
    }
  };

  const handleParentClick = (card: ScheduleCard) => {
    setReturnToParentId(null);
    setComposeDraft(null);
    setSelectedParentId(card.id);
    setSelectedCard(null);
  };

  const handleParentIdClick = (parentId: string) => {
    setReturnToParentId(null);
    setComposeDraft(null);
    setSelectedParentId(parentId);
    setSelectedCard(null);
  };

  const handleComposeDraft = (a: ScheduleCard, b: ScheduleCard) => {
    setReturnToParentId(null);
    setSelectedCard(null);
    setSelectedParentId(null);
    setComposeDraft([a, b]);
  };

  const closeCardDetail = () => {
    setSelectedCard(null);
    if (returnToParentId) {
      setSelectedParentId(returnToParentId);
      setReturnToParentId(null);
    }
  };

  return (
    <div className="app-shell h-screen flex flex-col overflow-hidden relative">
      <SpaceBackdrop />
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
        onSearchSelect={handleCardClick}
      />
      <div className={`flex flex-1 min-h-0 relative z-0 ${dragging ? "select-none" : ""}`}>
        <main className="app-main relative flex-1 min-w-[320px] min-h-0 flex flex-col overflow-hidden">
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <ScheduleViewRouter
              view={view}
              anchorDate={anchorDate}
              onDateChange={(d) => {
                if (d) setAnchorDate(d);
              }}
              onCardClick={handleCardClick}
              onParentClick={handleParentClick}
              onParentIdClick={handleParentIdClick}
              onComposeDraft={handleComposeDraft}
              composeSuccessAnim={composeSuccessAnim}
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
          className="app-shell-aside border-l flex flex-col shrink-0 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:shadow-xl max-md:w-full transition-interactive overflow-hidden"
          style={{
            width: chatOpen ? width : 0,
            maxWidth: chatOpen ? "100%" : 0,
            opacity: chatOpen ? 1 : 0,
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
        onClose={closeCardDetail}
        onUpdated={setSelectedCard}
      />
      <ParentCardDetailModal
        parentId={composeDraft ? null : selectedParentId}
        draftChildren={composeDraft}
        knownTitles={knownTitles}
        onClose={() => {
          setReturnToParentId(null);
          setSelectedParentId(null);
          setComposeDraft(null);
        }}
        onDraftCreated={(parent, sourceIds) => {
          setComposeSuccessAnim({ sourceIds, targetId: parent.id });
          window.setTimeout(() => setComposeSuccessAnim(null), 400);
        }}
        onOpenChild={(child) => {
          setReturnToParentId(selectedParentId ?? child.parentId ?? null);
          setSelectedParentId(null);
          setComposeDraft(null);
          setSelectedCard(child);
        }}
      />
      <CreateCardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
