# Live InventoryX integration smoke

**Date**: 2026-08-25  
**Scope**: Contract remediation verification against a running InventoryX instance (not MSW).

## Prerequisites

- InventoryX.Presentation running locally (default `https://localhost:7000` or project `.env.live.local` origin)
- Frontend `.env.live.local` with `VITE_INVENTORYX_ORIGIN` and optional `LIVE_E2E_EMAIL` / `LIVE_E2E_PASSWORD`
- `pnpm test:e2e:live` for automated shift contract check

## Manual checklist

| Step | Action | Pass criteria |
| ---- | ------ | ------------- |
| 1 | Sign in as owner/manager | Dashboard loads (`GET /api/v1/dashboard` 200) |
| 2 | Open shift with float | Shift status Open; appears in header chip |
| 3 | Record cash **in** movement | Request body uses `type: "CashIn"`, not `direction`; 200 response |
| 4 | Complete a cash sale | Sale final; receipt panel shows totals |
| 5 | Return from receipt panel | Return succeeds without starting a new sale first |
| 6 | Close shift with counted cash | Shift Closed; Z-report loads |
| 7 | Register PIN unlock | `POST /api/v1/auth/pin/exchange` returns register token |
| 8 | Offline snapshot prepare | `GET /api/v1/sync/snapshot?registerId=` 200 after unlock |
| 9 | Manager rejected list | `GET /api/v1/sync/rejected` returns array (may be empty) |

## Automated

- `tests/e2e/live-shift-contract.spec.ts` — open shift → cash in (`type` field) → close shift when live credentials are set.

## Evidence

| Date | Origin | Result | Notes |
| ---- | ------ | ------ | ----- |
| 2026-08-25 | `http://localhost:5291` (`.env.live.local`) | Pass | `live-shift-contract`: open → cash-in with `{ type: "CashIn" }` → close (`closingCounted`) all under 400; suite also covers live-smoke + us4 offline provider |

Record additional pass/fail rows when re-running against live InventoryX.
