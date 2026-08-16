import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../../shared/api/client/query-scope";
import { useSession } from "../../../../shared/auth/session-context";
import { fetchLocations, type LocationRecord } from "./locations-api";

export function useLocationsQueryKey(): readonly unknown[] {
  const { session } = useSession();
  return scopedQueryKey({
    tenantId: session?.tenantId ?? "anonymous",
    permissionRevision: permissionRevisionFor(session),
    resource: "locations",
  });
}

export function useLocations(): UseQueryResult<LocationRecord[]> {
  return useQuery({ queryKey: useLocationsQueryKey(), queryFn: fetchLocations });
}
