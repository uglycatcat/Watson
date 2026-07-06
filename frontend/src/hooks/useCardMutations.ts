import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScheduleCardInput } from "../lib/api";

export function useCardMutations() {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (body: ScheduleCardInput) => api.createCard(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ScheduleCardInput> }) =>
      api.updateCard(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });

  return {
    createCard: createMutation.mutateAsync,
    updateCard: updateMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}
