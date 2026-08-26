# Live InventoryX integration smoke

**Date**: 2026-08-25  
**Scope**: Contract remediation verification against a running InventoryX instance (not MSW).

## Prerequisites

- InventoryX.Presentation running locally (default `https://localhost:7000` or project `.env.live.local` origin)
- Frontend `.env.live.local` with `VITE_INVENTORYX_ORIGIN` and optional `LIVE_E2E_EMAIL` / `LIVE_E2E_PASSWORD`
- `pnpm test:e2e:live` for automated shift contract check

## Manual checklist

Incomplete steps stay unchecked until an operator records a live pass. Automated coverage does **not** mark a step complete.

| Step | Action                        | Pass criteria                                                     | Status                                            |
| ---- | ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Sign in as owner/manager      | Dashboard loads (`GET /api/v1/dashboard` 200)                     | [x] Automated (`live-smoke`)                      |
| 2    | Open shift with float         | Shift status Open; appears in header chip                         | [x] Automated (`live-shift-contract`)             |
| 3    | Record cash **in** movement   | Request body uses `type: "CashIn"`, not `direction`; 200 response | [x] Automated (`live-shift-contract`)             |
| 4    | Complete a cash sale          | Sale final; receipt panel shows totals                            | [ ] Deferred — manual only                        |
| 5    | Return from receipt panel     | Return succeeds without starting a new sale first                 | [ ] Deferred — manual only                        |
| 6    | Close shift with counted cash | Shift Closed; Z-report loads                                      | [x] Automated (`live-shift-contract`)             |
| 7    | Register PIN unlock           | `POST /api/v1/auth/pin/exchange` returns register token           | [ ] Deferred — unit/MSW covered; live UI optional |
| 8    | Offline snapshot prepare      | `GET /api/v1/sync/snapshot?registerId=` 200 after unlock          | [x] Automated (`us4-offline-provider`)            |
| 9    | Manager rejected list         | `GET /api/v1/sync/rejected` returns array (may be empty)          | [ ] Deferred — manual / MSW                       |

## Automated

- `tests/e2e/live-shift-contract.spec.ts` — open shift → cash in (`type` field) → close shift when live credentials are set.
- `tests/e2e` live smoke / offline provider specs as noted in the checklist.

## Evidence

| Date       | Origin                                      | Result                                           | Notes                                                                                                                                                                                                            |
| ---------- | ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-25 | `http://localhost:5291` (`.env.live.local`) | Automated steps pass; **not** a full manual gate | Automated: `live-shift-contract` (open → `{ type: "CashIn" }` → close under 400), `live-smoke` (login + dashboard), `us4-offline-provider` (prepare/sync). Manual UI steps 4–5 and 7 / 9 remain unchecked above. |

Record additional pass/fail rows when re-running against live InventoryX. Check off deferred manual steps only after a live operator pass.
