# US2 validation: counter sale, hold, split tender, and return (T082)

Recorded: 2026-08-13
Feature: `001-inventory-pos-frontend`
Scenario: [`quickstart.md`](../quickstart.md) Scenario C — Counter Sale, Hold, Split Tender, and Return
Phase 4 tasks: T064–T081 implemented; this record closes T082.

## Environment and caveat on live-versus-mocked evidence

| Item                | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Package manager     | pnpm 11.20.0                                                                 |
| Toolchain           | TypeScript 6.0.3 strict, React 19.2.8, Vite 8.2.1, Vitest 4.1.10             |
| Router              | TanStack Router 1.170.27 with router-plugin 1.168.30                         |
| E2E runner          | Playwright 1.62.1                                                            |
| InventoryX instance | **Not available on this machine**                                            |
| Provider contract   | `openapi/inventoryx-v1.json` snapshot (see `openapi/SOURCE.md`)              |
| Network under test  | MSW — `src/shared/test/msw/us1-scenario.ts` (browser) and `server.ts` (node) |

**Mocked-versus-live caveat.** No InventoryX server was reachable, so every request in
this record was served by Mock Service Worker against the committed OpenAPI snapshot.
Contract shape, RFC 7807 errors, and decimal-string preservation are verified against
the snapshot, **not** against a running provider. Quickstart steps that require a live
backend remain outstanding and must be re-run against a real instance before release.
Identifiers below are fixture identities from the mocked provider state.

## Red-then-green evidence

US2 tests were added before the corresponding feature modules and observed failing for
missing behaviour, then turned green after implementation. Representative focused loops:

| Task     | Test file                                                   | Green (after implementation) |
| -------- | ----------------------------------------------------------- | ---------------------------- |
| T064     | `tests/contract/us2-pos.contract.test.ts`                   | pass                         |
| T065     | `src/features/pos/cart/cart-reducer.test.ts`                | pass                         |
| T066     | `src/features/pos/acquisition/product-acquisition.test.tsx` | pass                         |
| T067     | `src/features/pos/checkout/checkout.test.tsx`               | pass                         |
| T068     | `src/features/pos/after-sale/after-sale.test.tsx`           | pass                         |
| T069     | `tests/e2e/us2-counter-sale.spec.ts`                        | pass (Chromium)              |
| T070     | `tests/e2e/us2-pos-quality.spec.ts`                         | pass (Chromium)              |
| T043/US1 | `src/features/pos/first-sale.integration.test.tsx`          | pass — US1 cash path kept    |

Defects the red phase and later gates exposed, and the fix that turned them green:

- Playwright `keyboard.type` is slower than a wedge burst, so the scanner's idle reset
  dropped the leading digit and treated `01234567890` as unknown. The wedge window is
  now 200 ms, and E2E injects a synchronous `keydown` burst on `document`.
- After a completed sale the workspace shows the receipt panel, which hides the Returns
  tab. Scenario C returns after `Start a new sale`.
- Mobile 320 px hides the desktop Primary nav; quality navigation now opens the sheet.
- Unused `src/features/pos/cart/cart.ts` was removed after the workspace moved to
  `cart-store.ts`, so coverage no longer counted a dead module.

## Scenario C walkthrough

Driven by `tests/e2e/us2-counter-sale.spec.ts` (`@critical`) against the stateful US1/US2
MSW scenario, plus component tests for holds, split tenders, approval, returns, and
delivery.

| Step | Scenario C action                                                        | Surface | Result |
| ---- | ------------------------------------------------------------------------ | ------- | ------ |
| 1    | Add products by hardware-scanner burst, typo-tolerant search, favourites | `/pos`  | Pass   |
| 2    | Hold the cart, serve another cash sale, recall the held sale             | `/pos`  | Pass   |
| 3    | Split the recalled cart between Cash 50.00 and Card 35.00                | `/pos`  | Pass   |
| 4    | Deliver the final receipt by email                                       | `/pos`  | Pass   |
| 5    | Look up the earlier receipt and return one line to stock                 | `/pos`  | Pass   |

Cart context never left the POS workspace. One scan produced one add. The client does
not recompute tax, total, or change; `selectServerTotals` reads the InventoryX quote
only. A 423 approval-required response pauses completion until a manager identity is
supplied (`checkout.test.tsx`). Exchange net settlement is covered at component level
in `after-sale.test.tsx` (the `@critical` journey returns one line after the split
tender).

### Server-authoritative amounts

Split-tender component evidence uses the fixture quote from
`tests/fixtures/provider/us2.ts` (`splitCompletedSale`) and renders those strings as
returned. E2E amounts are whatever the MSW scenario computed for the seeded lines; they
were displayed, not recalculated. No live InventoryX totals were observed.

### Print

The receipt view exposes **Print receipt**, which calls `globalThis.print()`. Playwright
did not open a native print dialog in this run (the browser UI is outside the page).
Email delivery is asserted: the mocked provider queued email and the workspace showed
`Email queued`.

### Scanner and timing (T070)

| Check                                                                  | Result |
| ---------------------------------------------------------------------- | ------ |
| Hardware-wedge burst adds `Sugar 1kg` for barcode `6001234567890`      | Pass   |
| Camera denial focuses `#typed-barcode`                                 | Pass   |
| Barcode-to-cart p95 under 200 ms against the mock provider (8 samples) | Pass   |

## Responsive and accessibility evidence

`pnpm exec playwright test --project=chromium tests/e2e/us2-pos-quality.spec.ts`
and the US1 a11y suite re-run in the same Chromium session.

| Check                                                 | Viewport / condition | Result |
| ----------------------------------------------------- | -------------------- | ------ |
| axe: zero critical or serious POS violations          | 320 x 800 (mobile)   | Pass   |
| axe: zero critical or serious POS violations          | 768 x 1024 (tablet)  | Pass   |
| axe: zero critical or serious POS violations          | 1440 x 900 (desktop) | Pass   |
| US1 surface axe, keyboard-only till, 200% zoom reflow | Chromium             | Pass   |

**Browser caveat.** Only the Chromium project ran. Playwright's Firefox and WebKit
binaries cannot be installed on this machine, so cross-browser E2E remains unverified.

## Merge gates

| Gate           | Command                                                              | Result                                     |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| Format         | `pnpm format`                                                        | Pass                                       |
| Lint           | `pnpm lint` (`--max-warnings=0`)                                     | Pass                                       |
| Typecheck      | `pnpm typecheck`                                                     | Pass                                       |
| Unit/component | `pnpm test:coverage`                                                 | Pass — 39 files, 226 tests, thresholds met |
| OpenAPI drift  | `pnpm api:check`                                                     | Pass                                       |
| E2E + a11y     | Chromium: US1 first-sale + US1 a11y + US2 counter-sale + US2 quality | Pass                                       |

### Coverage

Global (thresholds 85% lines/functions/statements, 80% branches):

- Statements 92.48% (1649/1783)
- Branches 82.03% (886/1080)
- Functions 91.7% (586/639)
- Lines 94.23% (1554/1649)

Special gates:

- `src/shared/money/**` and `src/shared/auth/access-policy.ts` remain above their 95/90
  thresholds.
- `src/features/pos/checkout/**.ts` (idempotent sale completion) remains 100% on the
  TypeScript glob. `payment-panel.tsx` is covered by component tests but is outside that
  `.ts`-only glob.

## Deviations and remaining work

- All provider interaction is mocked; nothing here is provider-verified.
- Cross-browser E2E (Firefox, WebKit) is unverified.
- Native print dialog is not Playwright-asserted.
- QR receipt delivery is implemented as a channel on the delivery API; the `@critical`
  journey asserts email only.
- MobileMoney / BankTransfer / Cheque tenders are in the typed payment schema; the
  split-payment panel used in Scenario C collects Cash and Card.
- No plan-pinned dependency version was changed.

## Conclusion

US2 is a deployable online counter lifecycle against the contracted InventoryX surface:
scan, search, favourites, hold/recall, split Cash/Card, receipt email, and return stay
inside `/pos`, with server-authoritative totals and mocked-provider evidence only.
Deployment against a real InventoryX instance still requires live provider verification.
