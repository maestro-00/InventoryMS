# Architecture

InventoryMS is a single SPA/PWA that consumes InventoryX over a versioned OpenAPI
contract. The backend remains authoritative for money, stock, permissions, and
offline apply results.

## Runtime topology

```text
Browser
  ├─ AppProviders (Query, Session, Telemetry, PWA, ErrorBoundary)
  ├─ TanStack Router (permission-aware routes)
  ├─ Feature modules (POS, catalogue, inventory, billing, …)
  ├─ openapi-fetch client → InventoryX /api/v1
  ├─ Dexie register partition (tenant:register scoped)
  └─ Service worker (precache shell; NetworkOnly for /api/)
```

## Boundaries

| Concern                        | Owner                                                             |
| ------------------------------ | ----------------------------------------------------------------- |
| Access / refresh tokens        | In-memory `SessionManager` only                                   |
| Session durability             | Provider-set httpOnly cookie, restored on startup (`SECURITY.md`) |
| DTO types                      | Generated from `openapi/inventoryx-v1.json`                       |
| UI state (loading/empty/error) | `src/shared/ui/states`                                            |
| Offline queue / snapshots      | `src/shared/db` + `src/features/offline-sync`                     |
| Telemetry                      | Scrubbed allowlist (`docs/telemetry.md`)                          |

## Session lifecycle

1. Cold load starts in `restoring`. When `inventoryx_session` is present,
   `SessionManager.restore()` POSTs `/api/v1/auth/refresh` with credentials (empty body;
   the httpOnly `inventoryx_refresh` cookie authenticates).
2. Route guards `await context.sessionManager.whenRestored()` before deciding, so a deep
   link waits for the restore instead of bouncing to `/login`.
3. Guards read the session from the manager, not from React-rendered context, so a guard
   never observes a session that has been set but not yet re-rendered.
4. A 401 triggers one refresh and one retry, shared by `inventoryxClient` and
   `authorizedFetch`. Only 400/401/403 from the refresh endpoint end the session; 5xx,
   429, and network failures leave it intact. Sign-out calls `/api/v1/auth/logout` so the
   provider clears both cookies.

## Offline model

1. Prepare register → atomic snapshot replace in Dexie.
2. Sell offline with client sale ids while authorized.
3. Sync when online; conflicts and rejects stay reviewable.
4. Never auto-delete financial queue rows under storage pressure.

P4 production release additionally requires InventoryX readiness (rejected-sale
persistence, complete snapshot contract, live E2E). Local fixtures cannot waive that gate.

## Security deployment

Static hosting should serve `public/_headers` (CSP + Trusted Types + camera self).
See `SECURITY.md`.

## Testing layers

| Layer                   | Location                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| Unit / component        | `src/**/*.test.*`                                                          |
| Contract                | `tests/contract`                                                           |
| Performance budgets     | `tests/performance`, `scripts/check-bundle-budget.mjs`, `lighthouserc.cjs` |
| E2E / a11y / responsive | `tests/e2e`                                                                |
| Visual                  | `tests/visual`                                                             |
| IndexedDB fixtures      | `tests/fixtures/indexeddb`                                                 |

## Migration

Prototype pages/services/auth are removed. Closure record:
`specs/001-inventory-pos-frontend/migration-inventory.md`.
