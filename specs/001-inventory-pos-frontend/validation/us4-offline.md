# US4 Offline validation

**Date**: 2026-08-14  
**Mode**: Live InventoryX (`http://localhost:5291`) + MSW browser/quality suites  
**Provider gate (T101–T110)**: Complete (unit + live Scenario D evidence)

## Evidence

| Area                               | Result      | Notes                                                                                                |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| InventoryX register-token policy   | PASS (unit) | `RegisterTokenAuthorizationTests`                                                                    |
| Historical fiscal snapshot         | PASS (unit) | `OfflineFiscalSnapshotTests`                                                                         |
| Snapshot completeness              | PASS (unit) | favourites, receipt template, tracking, tombstones                                                   |
| Rejected-sale reconciliation       | PASS (unit) | retryRelease / reconcileLinked                                                                       |
| Frontend Dexie / auth / sync unit  | PASS        | IndexedDB + MSW fixtures                                                                             |
| T116 browser durability            | PASS        | `pnpm test:e2e:offline` — IndexedDB reload, multi-tab, lock, storage, SW contract, 100-sale recovery |
| T118 offline review quality        | PASS        | 320/768/1440 axe, keyboard focus, 200% zoom equivalent                                               |
| Live Playwright config             | PASS        | `playwright.live.config.ts` + `VITE_E2E_OFFLINE_BRIDGE=true`                                         |
| Live smoke (login → InventoryX)    | PASS        | `tests/e2e/live-smoke.spec.ts`                                                                       |
| Live smoke authenticated dashboard | PASS        | `LIVE_E2E_*` from `.env.live.local`                                                                  |
| T117 / Scenario D provider E2E     | PASS        | prepare → offline sales → sync (`applied` / conflict / `rejected` / replay / 12h)                    |
| T117 100-sale live batch           | PASS        | recover after reload + re-auth; sync batches without MSW                                             |
| T128 apply-sync integration        | PASS        | unit + live: snapshot merge, overlay retirement, final receipt, fiscal ingest mapping                |
| Quickstart Scenario D live         | PASS        | Recorded via `pnpm test:e2e:live` (US4 provider specs)                                               |

## Live run (2026-08-14)

```text
pnpm test:e2e:offline
# 8 passed (browser + quality, Chromium)

pnpm test:e2e:live
# live-smoke: 2 passed
# us4-offline-provider: 2 passed (Scenario D + 100-sale)
```

Origin: `VITE_INVENTORYX_ORIGIN=http://localhost:5291` (HTTP; HTTPS on that port is not served).

## Honest checkpoint

US4 provider readiness (T101–T110), frontend modules (T111–T132), and live Scenario D
(T116–T118, T128, T133) have passing evidence in this environment.

Remaining product risk (not task blockers):

- POS UI still completes sales online-first; offline completion is exercised via the
  `VITE_E2E_OFFLINE_BRIDGE` harness rather than cashier chrome alone.
- JWT often omits `permissions`; client maps role → Cycle 1 permission bundles in
  `session-bootstrap.ts` when the claim is empty.
- Live tenants may need location/register/product/shift seed (provider E2E creates these).

P4 release is no longer blocked on missing Scenario D provider evidence.
