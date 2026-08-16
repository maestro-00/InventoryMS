import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";
import {
  fetchTenant,
  updateTenant,
  type TenantProfile,
  type TenantUpdate,
} from "./tenant-api";

export interface TenantResource {
  tenant: TenantProfile;
  etag: string | undefined;
}

export function useTenantQueryKey(): readonly unknown[] {
  const { session } = useSession();
  return scopedQueryKey({
    tenantId: session?.tenantId ?? "anonymous",
    permissionRevision: permissionRevisionFor(session),
    resource: "tenant",
  });
}

export function useTenant(): UseQueryResult<TenantResource> {
  const queryKey = useTenantQueryKey();
  return useQuery({ queryKey, queryFn: fetchTenant });
}

export function useUpdateTenant(): UseMutationResult<
  TenantProfile,
  Error,
  { update: TenantUpdate; etag?: string | undefined }
> {
  const queryClient = useQueryClient();
  const queryKey = useTenantQueryKey();
  return useMutation({
    mutationFn: ({
      update,
      etag,
    }: {
      update: TenantUpdate;
      etag?: string | undefined;
    }) => updateTenant(update, etag),
    onSuccess: (tenant) => {
      queryClient.setQueryData<TenantResource>(queryKey, (current) => ({
        tenant,
        etag: current?.etag,
      }));
    },
  });
}
