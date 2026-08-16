import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../../shared/api/client/query-scope";
import { useSession } from "../../../../shared/auth/session-context";
import {
  createCategory,
  deactivateCategory,
  fetchCategories,
  updateCategory,
  type CategoryInput,
  type CategoryNode,
} from "./categories-api";

export function useCategoryQueryKey(): readonly unknown[] {
  const { session } = useSession();
  return scopedQueryKey({
    tenantId: session?.tenantId ?? "anonymous",
    permissionRevision: permissionRevisionFor(session),
    resource: "categories",
  });
}

export function useCategories(): UseQueryResult<CategoryNode[]> {
  return useQuery({ queryKey: useCategoryQueryKey(), queryFn: fetchCategories });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const queryKey = useCategoryQueryKey();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const create = useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      updateCategory(id, input),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateCategory(id),
    onSuccess: invalidate,
  });

  return { create, rename, deactivate };
}
