import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "./useToast";

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["cards"] }),
    ]);

  const create = useMutation({
    mutationFn: (name: string) => api.createCategory(name),
    onSuccess: async () => {
      await refresh();
      toast.success("分类已创建");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: async () => {
      await refresh();
      toast.success("分类已删除，关联卡片已归入「无」");
    },
  });

  return {
    createCategory: create.mutateAsync,
    deleteCategory: remove.mutateAsync,
    isCreatingCategory: create.isPending,
    isDeletingCategory: remove.isPending,
  };
}
