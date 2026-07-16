import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ScheduleCard } from "../../lib/api";
import { useCardMutations } from "../../hooks/useCardMutations";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CardGrid } from "./CardGrid";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCardGrid } from "../ui/Skeleton";

interface TrashViewProps {
  onCardClick: (card: ScheduleCard) => void;
  onLeaveTrash?: () => void;
}

function TrashBadge({ card }: { card: ScheduleCard }) {
  if (card.status === "completed") {
    return (
      <span
        className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center rounded text-[10px] text-white"
        style={{ background: "var(--accent)", borderRadius: "var(--radius-sm)" }}
        title="已完成"
      >
        ✓
      </span>
    );
  }
  if (card.status === "deleted") {
    return (
      <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-600" title="已删除" />
    );
  }
  return null;
}

export function TrashView({ onCardClick, onLeaveTrash }: TrashViewProps) {
  const { restoreCard, permanentDeleteCard, isRestoring, isPermanentDeleting } = useCardMutations();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cards", "trash"],
    queryFn: () => api.getCards({ view: "trash" }),
  });

  const cards = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => {
      const ta = a.trashedAt ? new Date(a.trashedAt).getTime() : 0;
      const tb = b.trashedAt ? new Date(b.trashedAt).getTime() : 0;
      return tb - ta;
    });
  }, [data?.items]);

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
      await restoreCard(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "恢复失败");
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmId) return;
    setActionError(null);
    try {
      await permanentDeleteCard(confirmId);
      setConfirmId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "永久删除失败");
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-lg font-semibold mb-3 shrink-0">垃圾箱</h2>
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <SkeletonCardGrid />
        ) : cards.length === 0 ? (
          <EmptyState
            icon="🗑"
            title="垃圾箱是空的"
            description="已删除的日程会出现在这里"
            action={onLeaveTrash ? { label: "返回日程", onClick: onLeaveTrash } : undefined}
          />
        ) : (
          <CardGrid
            cards={cards}
            onCardClick={onCardClick}
            sortMode="preserve"
            renderCardChrome={(c) => (
              <>
                <TrashBadge card={c} />
                <div className="absolute bottom-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="text-[10px] px-1.5 py-0.5 rounded-md border transition-interactive"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    disabled={isRestoring}
                    onClick={(e) => void handleRestore(c.id, e)}
                  >
                    恢复
                  </button>
                  <button
                    type="button"
                    className="text-[10px] px-1.5 py-0.5 rounded-md border text-red-600 transition-interactive"
                    style={{ borderColor: "var(--border)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(c.id);
                    }}
                  >
                    永久删除
                  </button>
                </div>
              </>
            )}
          />
        )}
      </div>
      <ConfirmDialog
        open={!!confirmId}
        title="永久删除"
        message="永久删除后无法恢复，确定继续吗？"
        confirmLabel="永久删除"
        className="max-w-xs"
        onConfirm={() => void handlePermanentDelete()}
        onCancel={() => setConfirmId(null)}
        loading={isPermanentDeleting}
      />
      {actionError && (
        <p className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-sm px-4 py-2 rounded-md text-white bg-red-600" style={{ boxShadow: "var(--shadow-md)" }}>
          {actionError}
        </p>
      )}
    </div>
  );
}
