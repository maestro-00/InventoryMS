# US1 validation: onboarding through first sale (T062)

Recorded: 2026-08-13
Feature: `001-inventory-pos-frontend`
Scenario: [`quickstart.md`](../quickstart.md) Scenario A — Onboard Through First Sale
Phase 3 tasks: T040–T061 implemented; this record closes T062.

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
Contract shape, ETag/If-Match handling, RFC 7807 errors, page-size clamping, and decimal
string preservation are verified against the snapshot, **not** against a running
provider. The quickstart steps that require a live backend
(`curl .../swagger/v1/swagger.json`, provider verification of the four offline readiness
items) remain outstanding and must be re-run against a real instance before release.
The IDs below are therefore **fixture identities from the mocked provider state**, not
identifiers minted by a real InventoryX database.

## Red-then-green evidence

Every Phase 3 test file was added before its implementation and observed failing for the
intended missing behaviour. Representative focused loops:

| Task | Test file                                                                                        | Red (before implementation)                                                                                                                                | Green (after implementation) |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| T040 | `tests/contract/us1-first-sale.contract.test.ts`                                                 | `pnpm vitest run tests/contract/us1-first-sale.contract.test.ts` — failed to resolve the missing feature API modules                                       | pass                         |
| T041 | `src/features/auth/us1-auth.test.tsx`, `src/features/onboarding/onboarding.test.tsx`             | `pnpm vitest run src/features/auth src/features/onboarding` — missing form and checklist components                                                        | pass                         |
| T042 | `src/features/catalogue/us1-catalogue.test.tsx`, `src/features/inventory/opening-stock.test.tsx` | `pnpm vitest run src/features/catalogue src/features/inventory` — missing product, import, location, opening-stock components                              | pass                         |
| T043 | `src/features/pos/first-sale.integration.test.tsx`                                               | `pnpm vitest run src/features/pos/first-sale.integration.test.tsx` — missing `PosWorkspace`                                                                | pass                         |
| T044 | `tests/e2e/us1-first-sale.spec.ts`                                                               | `npx playwright test --project=chromium tests/e2e/us1-first-sale.spec.ts` — no `/pos` route                                                                | pass                         |
| T045 | `tests/e2e/us1-first-sale.accessibility.spec.ts`                                                 | `npx playwright test --project=chromium tests/e2e/us1-first-sale.accessibility.spec.ts` — axe colour-contrast violations and unreachable keyboard controls | pass                         |
| T049 | `src/features/catalogue/categories/categories.test.tsx`                                          | `pnpm vitest run src/features/catalogue/categories` — missing category maintenance                                                                         | pass                         |
| T057 | `src/features/pos/receipts/receipt-template.test.tsx`                                            | `pnpm vitest run src/features/pos/receipts` — missing template settings                                                                                    | pass                         |
| T059 | `src/features/settings/business/business-settings.test.tsx`                                      | `pnpm vitest run src/features/settings` — missing business settings                                                                                        | pass                         |

Defects the red phase exposed and the fix that turned them green:

- The Google callback re-submitted its tokens on every render, producing a React
  "maximum update depth exceeded" loop. `src/features/auth/google-callback.tsx` now
  consumes the returned tokens exactly once.
- Navigation used document anchors, so a page change reloaded the document and dropped
  the in-memory session. `AppShell` now accepts the router's `Link`, and the router
  instance is created once and invalidated on session change.
- The mobile navigation sheet overrode Radix's `aria-labelledby`, which broke the
  dialog-title association for screen readers; the title is now wired by the primitive.
- Global palette tokens failed WCAG 1.4.3; `src/app/styles.css` foreground, primary,
  accent, and destructive colours were darkened until axe reported no contrast issues.

## Scenario A walkthrough

Driven by `tests/e2e/us1-first-sale.spec.ts` (`@critical`) against the stateful US1 MSW
scenario, plus `src/features/pos/first-sale.integration.test.tsx` at component level.

| Step | Scenario A action                                                                                  | Surface                                     | Result |
| ---- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| 1    | Register a Ghana business (email, password, name, GHS, country, business type)                     | `/register`                                 | Pass   |
| 2    | Confirm the 14-day Professional trial and checklist                                                | `/onboarding`                               | Pass   |
| 3    | Create `Main Shop`, one register, product `Sugar 1kg` (`SUG-001`, sell 10.00, cost 6.00, `GH-STD`) | `/locations`, `/pos`, `/catalogue/products` | Pass   |
| 4    | Record opening stock of 10                                                                         | `/inventory/opening-stock`                  | Pass   |
| 5    | Open the shift with a counted float of 100.00                                                      | `/pos`                                      | Pass   |
| 6    | Sell quantity 2 and pay 25.00 cash                                                                 | `/pos`                                      | Pass   |
| 7    | Open sale history and stock detail                                                                 | `/pos`                                      | Pass   |

### Server-authoritative amounts

All values are rendered exactly as the provider returned them; no total, tax, or change
is recomputed in the client, and decimal strings are preserved end to end.

| Field         | Value |
| ------------- | ----- |
| Subtotal      | 20    |
| Tax total     | 3     |
| Grand total   | 23    |
| Cash tendered | 25.00 |
| Change due    | 2     |

### Stock 10 to 8

Opening stock recorded 10 on hand for `Sugar 1kg` at `Main Shop`. After the sale of 2,
the workspace invalidates the scoped stock query and re-reads the provider; the till
shows `Sugar 1kg: 8 on hand`. This is asserted in both
`tests/e2e/us1-first-sale.spec.ts` and `src/features/pos/first-sale.integration.test.tsx`.
The client never decrements stock locally.

### Identities in the verified run (mocked provider state)

| Entity     | Identifier                                                   |
| ---------- | ------------------------------------------------------------ |
| Tenant     | `22222222-2222-4222-8222-222222222222`                       |
| Owner user | `11111111-1111-4111-8111-111111111111`                       |
| Location   | `33333333-3333-4333-8333-333333333333`                       |
| Category   | `77777777-7777-4777-8777-777777777777`                       |
| Product    | `44444444-4444-4444-8444-444444444444`                       |
| Register   | `88888888-8888-4888-8888-888888888888`                       |
| Shift      | `99999999-9999-4999-8999-999999999999`                       |
| Sale       | `a9999999-9999-4999-8999-999999999999`                       |
| Receipt    | `e9999999-9999-4999-8999-999999999999` (number `RCP-000001`) |

### Duplicate submission

`@critical a repeated payment click completes a single sale` clicks the payment control
repeatedly. The cart's `clientSaleId` is generated once and reused, `SaleSubmissionGuard`
blocks concurrent and repeated submissions, and sale history contains exactly one sale.

## Responsive and accessibility evidence (T045)

`npx playwright test --project=chromium tests/e2e/us1-first-sale.accessibility.spec.ts`

| Check                                                                    | Viewport / condition           | Result |
| ------------------------------------------------------------------------ | ------------------------------ | ------ |
| axe: zero critical or serious violations                                 | 320 x 640 (mobile)             | Pass   |
| axe: zero critical or serious violations                                 | 768 x 1024 (tablet)            | Pass   |
| axe: zero critical or serious violations                                 | 1440 x 900 (desktop)           | Pass   |
| Keyboard-only reachability and visible focus through the till's controls | 1440 x 900                     | Pass   |
| Reflow without horizontal scrolling                                      | 640 CSS px (1280 at 200% zoom) | Pass   |

Focus order follows the document order of the skip link, navigation, then the till's
controls; each focused control was asserted to have a non-zero rendered box, and the
"create register" action is reachable with the keyboard alone.

**Browser caveat.** Only the Chromium project ran. Playwright's Firefox and WebKit
binaries cannot be installed on this machine (`validateDependenciesLinux` fails for the
missing host libraries), so cross-browser E2E remains unverified.

## Merge gates

| Gate           | Command                                  | Result                                                           |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Format         | `pnpm format:check`                      | Pass                                                             |
| Lint           | `pnpm lint --max-warnings=0`             | Pass — zero errors, zero warnings                                |
| Typecheck      | `pnpm typecheck`                         | Pass                                                             |
| Unit/component | `pnpm test:coverage`                     | Pass — 33 files, 174 tests, thresholds met                       |
| OpenAPI drift  | `pnpm api:check`                         | Pass — snapshot matches the generated client                     |
| Build          | `pnpm build`                             | Pass — Vite 8.2.1 with PWA `injectManifest`, 46 precache entries |
| E2E + a11y     | `npx playwright test --project=chromium` | Pass — 7 of 7 (2 `@critical`, 5 `@a11y`)                         |

### Coverage

Global (thresholds 85% lines/functions/statements, 80% branches):

- Statements 91.94% (1279/1391)
- Branches 82.77% (673/813)
- Functions 90.16% (440/488)
- Lines 94.06% (1204/1280)

Special gates (threshold 95% lines/functions/statements, 90% branches):

- `src/shared/money/decimal.ts` — 100% across all four measures
- `src/shared/auth/access-policy.ts` — 100% statements/functions/lines, 94.44% branches
- `src/features/pos/checkout/**.ts` (idempotent sale completion) — 100% across all four
  measures; this threshold was added to `vitest.config.ts` in T062 so the constitution's
  idempotent-mutation gate is enforced rather than merely observed.

## Deviations and remaining work

- All provider interaction is mocked; nothing here is provider-verified. Re-run Scenario
  A, `pnpm api:check` after a fresh snapshot capture, and the offline readiness items
  against a live InventoryX instance before release.
- Cross-browser E2E (Firefox, WebKit) is unverified because the browsers cannot be
  installed here.
- Batch tracking exposes field stubs only, as T051 specifies; manufacture, expiry, FEFO,
  and damage/saleable validation belong to US10 (T207/T209).
- No plan-pinned dependency version was changed.
- Lighthouse and visual-regression evidence are not US1 gates and were not collected.

## Conclusion

US1 is a deployable online MVP against the contracted InventoryX surface: an owner can
register, configure a location, category, product, opening stock, and register, open a
shift, complete a cash sale with server-authoritative totals, print the final receipt,
see the sale once in history, and see stock fall from 10 to 8. Deployment against a real
InventoryX instance still requires the live provider verification listed above.
