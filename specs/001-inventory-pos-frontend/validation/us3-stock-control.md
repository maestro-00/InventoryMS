# US3 validation: stock control, transfers, counts, and alerts (T100)

Recorded: 2026-08-13
Feature: `001-inventory-pos-frontend`
Scenario: [`quickstart.md`](../quickstart.md) Scenario E — Stock portion only
(dispatch/receive, spot count, append-only movements). Purchasing / PO steps remain US7.
Phase 5 tasks: T084–T099 implemented; this record closes T100.

## Environment and caveat on live-versus-mocked evidence

| Item                | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Package manager     | pnpm 11.20.0                                                                 |
| Toolchain           | TypeScript 6.0.3 strict, React 19.2.8, Vite 8.2.1, Vitest 4.1.10             |
| Router              | TanStack Router 1.170.x with router-plugin                                   |
| E2E runner          | Playwright 1.62.1                                                            |
| InventoryX instance | **Not available on this machine**                                            |
| Provider contract   | `openapi/inventoryx-v1.json` snapshot (see `openapi/SOURCE.md`)              |
| Network under test  | MSW — `src/shared/test/msw/us1-scenario.ts` (browser) and `server.ts` (node) |

**Mocked-versus-live caveat.** No InventoryX server was reachable, so every request in
this record was served by Mock Service Worker against the committed OpenAPI snapshot.
Contract shape, RFC 7807 errors, ETag conflicts, and decimal-string preservation are
verified against the snapshot, **not** against a running provider. Quickstart steps that
require a live backend remain outstanding and must be re-run against a real instance
before release. Identifiers below are fixture identities from the mocked provider state.

## Red-then-green evidence

US3 tests were added before (or alongside) the inventory modules and observed failing for
boundary validation and missing UI behaviour, then turned green after fixture UUID fixes,
MSW multi-location support, and workflow handlers. Representative focused loops:

| Task | Test file                                                         | Green (after implementation)      |
| ---- | ----------------------------------------------------------------- | --------------------------------- |
| T084 | `tests/contract/us3-inventory.contract.test.ts`                   | pass                              |
| T085 | `src/features/inventory/stock/stock.test.tsx`                     | pass                              |
| T086 | `src/features/inventory/workflows/inventory-workflows.test.tsx`   | pass                              |
| T087 | `tests/e2e/us3-stock-control.spec.ts`                             | pass (Chromium)                   |
| T088 | `tests/e2e/us3-stock-quality.spec.ts`                             | pass (Chromium)                   |
| —    | `src/features/inventory/supporting/inventory-supporting.test.tsx` | pass — alerts/reorder/consumption |

Defects the red phase and later gates exposed, and the fix that turned them green:

- US3 fixture IDs used non-hex prefixes (`m…`, `t…`, `n…`) that failed `uuidSchema`;
  rewritten to RFC-shaped hex UUIDs matching US1 style.
- `createTransfer` / `dispatchTransfer` refetch by id; component tests now use stateful
  MSW handlers so Draft → Dispatched → ReceivedWithDiscrepancy is sequenced correctly.
- Adjustment pending copy keyed off `submit.data` and stayed visible after approve; it
  now keys off `pendingId`.
- MSW `POST /locations` replaced the entire list with one row and reused a single id;
  it now appends and assigns a second location id so Warehouse B coexists with Main Shop.
- Dense stock table `overflow-x-auto` failed axe `scrollable-region-focusable` on mobile
  and tablet; the region is now focusable with an accessible name.
- Required-field asterisks broke exact Testing Library `/^location$/i` matchers; tests
  and E2E use `/^location/i` (and the same pattern for product/reason).

## Scenario E stock walkthrough

Driven by `tests/e2e/us3-stock-control.spec.ts` (`@critical`) against the stateful MSW
scenario, plus workflow component tests for approval separation, discrepancy receive,
and stale count ETag recovery.

| Step | Scenario E (stock) action                                     | Surface                | Result |
| ---- | ------------------------------------------------------------- | ---------------------- | ------ |
| 1    | Seed Main Shop + Warehouse B, product, opening qty 10         | locations/catalogue    | Pass   |
| 2    | Create draft transfer of 10, dispatch                         | `/inventory/transfers` | Pass   |
| 3    | Receive 8 with discrepancy reason                             | `/inventory/transfers` | Pass   |
| 4    | Open spot count, save lines, submit, approve                  | `/inventory/counts`    | Pass   |
| 5    | Review movements list (Adjustment / Transfer entries present) | `/inventory/movements` | Pass   |

Append-only correction behaviour (original ledger entry retained; correction posts with
`correlationId`) is covered in `stock.test.tsx` and the US3 contract suite. Same-approver
denial and pending approval are covered in `inventory-workflows.test.tsx`. Reorder
suggestions remain read-only (no PO create) per T097; applying suggestions is US7.

### Server-authoritative quantities

Quantities and statuses displayed are those returned by the mocked InventoryX responses
(`ReceivedWithDiscrepancy`, count `Approved`, movement deltas). The client does not
recompute stock balances or invent variance values beyond what the provider body
contains after Zod boundary parsing.

## Accessibility and responsive quality

| Check                                                       | Viewport / condition | Result |
| ----------------------------------------------------------- | -------------------- | ------ |
| axe: zero critical or serious inventory stock violations    | 320 x 800 (mobile)   | Pass   |
| axe: zero critical or serious inventory stock violations    | 768 x 1024 (tablet)  | Pass   |
| axe: zero critical or serious inventory stock violations    | 1440 x 900 (desktop) | Pass   |
| Stock table reflow at 200% zoom without page-level H-scroll | 640 x 800            | Pass   |
| Count scanner buffer available with quantity field focused  | desktop              | Pass   |

**Browser caveat.** Only the Chromium project ran. Cross-browser E2E (Firefox, WebKit)
remains unverified on this machine.

## Merge gates

| Gate           | Command                                             | Result                              |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| Lint           | `pnpm lint` (`--max-warnings=0`)                    | Pass                                |
| Typecheck      | `pnpm typecheck`                                    | Pass (recorded with this close-out) |
| Unit/component | `pnpm test:coverage`                                | Pass — thresholds met               |
| OpenAPI drift  | `pnpm api:check`                                    | Pass (US3 ops present in snapshot)  |
| E2E + a11y     | Chromium: `us3-stock-control` + `us3-stock-quality` | Pass — 6/6                          |

### Coverage

Global (thresholds 85% lines/functions/statements, 80% branches), from the green
`pnpm test:coverage` run used to close this phase:

- Statements 91.39% (1997/2185)
- Branches 80.35% (1092/1359)
- Functions 90.66% (709/782)
- Lines 93.61% (1890/2019)

Special gates for money and access-policy modules remain above their elevated thresholds
from prior phases.

## Deviations and remaining work

- All provider interaction is mocked; nothing here is provider-verified.
- Scenario E purchasing / PO / landed-cost steps are out of scope for US3 (US7).
- Alert thresholds are provider-defined and shown as read-only; no tenant threshold
  editor is exposed because the InventoryX contract does not offer one for this build.
- Cross-browser E2E (Firefox, WebKit) is unverified.
- No plan-pinned dependency version was changed.

## Conclusion

US3 is a deployable stock-control surface against the contracted InventoryX inventory
operations: location stock and rollups, append-only movements with corrections,
adjustments/consumption with approval separation, transfer discrepancy receive, spot
counts with ETag recovery, alerts, and read-only reorder suggestions under `/inventory/*`,
with mocked-provider evidence only. Deployment against a real InventoryX instance still
requires live provider verification.
