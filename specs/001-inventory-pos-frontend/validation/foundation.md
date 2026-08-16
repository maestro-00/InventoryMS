# Foundation validation (T039)

Recorded: 2026-08-13  
Feature: `001-inventory-pos-frontend`  
Phase 2 tasks: T015–T039 marked complete in `tasks.md`

## Commands

| Gate           | Command                          | Result                                   |
| -------------- | -------------------------------- | ---------------------------------------- |
| Frozen install | `pnpm install --frozen-lockfile` | Pass — already up to date (pnpm 11.20.0) |
| Format         | `pnpm format:check`              | Pass                                     |
| Lint           | `pnpm lint --max-warnings=0`     | Pass                                     |
| Typecheck      | `pnpm typecheck`                 | Pass                                     |
| Coverage       | `pnpm test:coverage`             | Pass — 20 files, 70 tests                |
| OpenAPI drift  | `pnpm api:check`                 | Pass — snapshot matches generated client |
| Build          | `pnpm build`                     | Pass — Vite 8.2.1 + PWA injectManifest   |

E2E (`pnpm test:e2e:critical`), axe, and Lighthouse are not Phase 2 gates; they remain for US1+ journeys.

## Coverage

Global (thresholds 85% lines/functions, 80% branches):

- Statements 96.96% (415/428)
- Branches 90.23% (194/215)
- Functions 97.22% (140/144)
- Lines 97.24% (388/399)

Special gates:

- `src/shared/money/decimal.ts`: 100% lines / 100% branches (threshold 95/90)
- `src/shared/auth/access-policy.ts`: 100% lines / 94.44% branches (threshold 95/90)

Audited Radix wrappers that are not yet consumed by foundation routes were excluded from coverage in `vitest.config.ts`. Offline modules are still stubs (US4).

## T014 after T038

`tests/legacy-boundary.test.ts` **passes**. `src/main.tsx` mounts `AppProviders`; it no longer imports `App.tsx` or `AuthContext`. `src/App.tsx` remains as a stub without `react-router-dom` until T214 deletes the prototype files.

## Shell accessibility (T022)

`src/app/app-shell.test.tsx` **passes** (5 tests):

- Skip link and keyboard-reachable primary navigation
- Focus restoration to the menu trigger after the drawer closes
- 320px overflow constraint (`overflow-x-hidden` / `max-w-full`)
- Route error boundary with support reference and Try again

## NetworkOnly API policy (T023)

`src/app/service-worker.test.ts` **passes** (2 tests). Source `src/app/service-worker.ts` precaches the app shell, registers `NetworkOnly` for `/api/`, and uses `NavigationRoute` fallback to `/index.html`. Production build used `vite-plugin-pwa` injectManifest (`dist/service-worker.js`, 13 precache entries).

## OpenAPI snapshot

Path: `openapi/inventoryx-v1.json`  
Source notes: `openapi/SOURCE.md`

Live Swagger dump from sibling `../InventoryX` via WebApplicationFactory was not available in this environment (host content-root / solution-root lookup failed). The snapshot was reconstructed from InventoryX contracts, `ContractSurfaceTests.cs`, and live-only filters, then annotated for RFC 7807, ETag/If-Match, and `x-inventoryx-live-only`. Re-export from a running InventoryX host when available and re-run `pnpm api:generate` / `pnpm api:check`.

## Blockers

None for Phase 2 / US1 start. P4 offline production integration remains blocked on InventoryX offline-readiness (plan.md). No user refresh token is written to durable storage.

## Next

Phase 3 / User Story 1 (T040+): onboard and complete the first sale.
