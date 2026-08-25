import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { SessionSnapshot } from "../../auth/access-policy";

export interface QueryScope {
  tenantId: string;
  locationId?: string;
  registerId?: string;
  permissionRevision: string;
}

export interface ScopedQueryKeyInput extends QueryScope {
  resource: string;
  filters?: Record<string, unknown>;
}

export function createQueryScope(scope: QueryScope): QueryScope {
  return { ...scope };
}

/**
 * Stable cache partition for role/permission changes. Must NOT use token expiry —
 * refresh rotates `expiresAt` and would remount every scoped query (Playwright
 * detach flakes on opening-stock / register forms).
 */
export function permissionRevisionFor(
  session: Pick<SessionSnapshot, "role" | "permissions"> | null | undefined,
): string {
  if (!session) return "none";
  return `${session.role}:${session.permissions.join(",")}`;
}

export function scopedQueryKey(input: ScopedQueryKeyInput): QueryKey {
  return [
    input.tenantId,
    input.locationId,
    input.registerId,
    input.permissionRevision,
    input.resource,
    input.filters,
  ];
}

export async function clearScopedQueries(
  client: QueryClient,
  scope: Pick<QueryScope, "tenantId" | "locationId" | "registerId">,
): Promise<void> {
  await client.cancelQueries({
    predicate: (query) => matchesScope(query.queryKey, scope),
  });
  client.removeQueries({
    predicate: (query) => matchesScope(query.queryKey, scope),
  });
}

/** Clears caches that include a location id (scoped keys and ad-hoc `["resource", locationId]`). */
export async function clearLocationCaches(
  client: QueryClient,
  locationId: string,
): Promise<void> {
  const matches = (key: QueryKey) =>
    key.some((part) => part === locationId);
  await client.cancelQueries({ predicate: (query) => matches(query.queryKey) });
  client.removeQueries({ predicate: (query) => matches(query.queryKey) });
}

function matchesScope(
  key: QueryKey,
  scope: Pick<QueryScope, "tenantId" | "locationId" | "registerId">,
): boolean {
  return (
    key[0] === scope.tenantId &&
    key[1] === scope.locationId &&
    key[2] === scope.registerId
  );
}

export function etagMeta(etag: string | null | undefined): { etag?: string } {
  return etag ? { etag } : {};
}
