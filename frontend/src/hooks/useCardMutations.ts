import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScheduleCardInput } from "../lib/api";
import { useToast } from "./useToast";

export function useCardMutations() {
  const qc = useQueryClient();
  const toast = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cards"] });

  const createMutation = useMutation({
    mutationFn: (body: ScheduleCardInput) => api.createCard(body),
    onSuccess: () => {
      invalidate();
      toast.success("日程已创建");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ScheduleCardInput> }) =>
      api.updateCard(id, body),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCard(id),
    onSuccess: () => {
      invalidate();
      toast.success("已移入垃圾箱");
    },
    onError: () => {
      void invalidate();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeCard(id),
    onSuccess: () => {
      invalidate();
      toast.success("已标记完成");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreCard(id),
    onSuccess: () => {
      invalidate();
      toast.success("已恢复");
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.permanentDeleteCard(id),
    onSuccess: () => {
      invalidate();
      toast.success("已永久删除");
    },
  });

  const composeParentMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.composeParent>[0]) => api.composeParent(body),
    onSuccess: () => {
      invalidate();
      toast.success("已组合为父卡片");
    },
  });

  const addChildToParentMutation = useMutation({
    mutationFn: ({ parentId, cardId }: { parentId: string; cardId: string }) =>
      api.addChildToParent(parentId, cardId),
    onSuccess: () => {
      invalidate();
      toast.success("已加入父卡片");
    },
  });

  const mergeParentsMutation = useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: string; sourceId: string }) =>
      api.mergeParents(targetId, sourceId),
    onSuccess: () => {
      invalidate();
      toast.success("已合并父卡片");
    },
  });

  const detachChildMutation = useMutation({
    mutationFn: (cardId: string) => api.detachChild(cardId),
    onSuccess: () => {
      invalidate();
      toast.success("已移出子卡片");
    },
  });

  return {
    createCard: createMutation.mutateAsync,
    updateCard: updateMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    completeCard: completeMutation.mutateAsync,
    restoreCard: restoreMutation.mutateAsync,
    permanentDeleteCard: permanentDeleteMutation.mutateAsync,
    composeParent: composeParentMutation.mutateAsync,
    addChildToParent: addChildToParentMutation.mutateAsync,
    mergeParents: mergeParentsMutation.mutateAsync,
    detachChild: detachChildMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCompleting: completeMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPermanentDeleting: permanentDeleteMutation.isPending,
    isComposing: composeParentMutation.isPending,
    isAddingChild: addChildToParentMutation.isPending,
    isMerging: mergeParentsMutation.isPending,
    isDetaching: detachChildMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    completeError: completeMutation.error,
    restoreError: restoreMutation.error,
    permanentDeleteError: permanentDeleteMutation.error,
  };
}
