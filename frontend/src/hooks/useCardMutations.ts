import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScheduleCardInput } from "../lib/api";

export function useCardMutations() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cards"] });

  const createMutation = useMutation({
    mutationFn: (body: ScheduleCardInput) => api.createCard(body),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ScheduleCardInput> }) =>
      api.updateCard(id, body),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCard(id),
    onSuccess: invalidate,
    onError: () => {
      // Ensure lists stay consistent if optimistic UI is added later
      void invalidate();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeCard(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreCard(id),
    onSuccess: invalidate,
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.permanentDeleteCard(id),
    onSuccess: invalidate,
  });

  return {
    createCard: createMutation.mutateAsync,
    updateCard: updateMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    completeCard: completeMutation.mutateAsync,
    restoreCard: restoreMutation.mutateAsync,
    permanentDeleteCard: permanentDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCompleting: completeMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPermanentDeleting: permanentDeleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    completeError: completeMutation.error,
    restoreError: restoreMutation.error,
    permanentDeleteError: permanentDeleteMutation.error,
  };
}
