---
description: "Dependency-ordered implementation tasks for the Inventory and POS frontend"
---

# Tasks: Inventory and POS Frontend

**Input**: Design documents from `/specs/001-inventory-pos-frontend/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), and [quickstart.md](./quickstart.md)

**Tests**: Automated tests are mandatory under Constitution Principle I. Within each
story, add and run the listed test first, confirm it fails for the intended missing
behavior, then implement. Provider readiness tests for US4 must fail before InventoryX
changes and pass before production offline integration is enabled.

**Organization**: Tasks are grouped by user story. Setup and foundational work establish
the full rewrite; each story phase then delivers an independently testable vertical
slice. Every task includes an exact file path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can proceed in parallel with adjacent tasks after its stated prerequisites.
- **[Story]**: Required only inside user-story phases.
- Unmarked tasks are dependency-ordered and should run sequentially.

## Phase 1: Setup - Replace the Prototype Foundation

**Purpose**: Establish the modern toolchain and remove incompatible implementation only
after reusable assets have been recorded.

- [x] T001 Inventory reusable assets/primitives and list every legacy file to retain or delete in `specs/001-inventory-pos-frontend/migration-inventory.md`
- [x] T002 Replace runtime dependencies/scripts with the exact plan versions and pnpm metadata in `package.json`, generate `pnpm-lock.yaml`, and remove `package-lock.json` and `bun.lockb`
- [x] T003 [P] Configure strict TypeScript 6 project references and ES2022/browser libraries in `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`
- [x] T004 [P] Configure Vite 8, SWC, TanStack Router generation, Tailwind CSS 4, aliases, chunking, and production headers in `vite.config.ts`, `src/app/styles.css`, and `components.json`
- [x] T005 [P] Configure zero-warning ESLint, type-aware rules, React Hooks, jsx-a11y, Prettier, and ignore files in `eslint.config.js`, `prettier.config.mjs`, and `.prettierignore`
- [x] T006 [P] Configure Vitest, jsdom, coverage thresholds, Testing Library setup, MSW lifecycle, and fake IndexedDB in `vitest.config.ts` and `src/shared/test/setup.ts`
- [x] T007 [P] Configure Chromium/Firefox/WebKit projects, required viewports, no merge retries, trace/video policy, and web server startup in `playwright.config.ts`
- [x] T008 [P] Create shared RFC 7807, auth, permissions, products, stock, sale, billing, purchasing, and report fixtures in `tests/fixtures/`
- [x] T009 [P] Configure the PWA manifest, install assets, offline fallback metadata, and icon generation sources in `public/manifest.webmanifest` and `public/icons/`
- [x] T010 [P] Replace environment documentation with non-secret InventoryX origin and optional telemetry configuration in `.env.example` and `src/vite-env.d.ts`
- [x] T011 [P] Create pull-request CI for frozen install, format, lint, typecheck, coverage, OpenAPI drift, build, P1-P3 critical browser, accessibility, and performance gates in `.github/workflows/ci.yml`; P4 offline E2E MUST be skipped or gated until T101-T110 pass
- [x] T012 [P] Create nightly/release CI for full browsers, repeated flake detection, 100-sale stress, provider contracts, dependency audit, and real-device/manual evidence checklist slots in `.github/workflows/nightly.yml` and `.github/workflows/release.yml`
- [x] T013 Create only the feature-sliced source/test directories and placeholder module boundaries in `src/app/`, `src/routes/`, `src/features/`, `src/shared/`, and `tests/`; do not replace or delete runtime entry points
- [x] T014 Add a failing legacy-boundary test proving the old entry point, auth/API layer, and route tree are not used once the new shell is wired in `tests/legacy-boundary.test.ts`

**Checkpoint**: Toolchain, one pnpm lockfile, and quality-gate configuration exist.
Legacy runtime entry points remain until later slices replace them; T013 MUST NOT
delete them here.

---

## Phase 2: Foundational - Shared Blocking Infrastructure

**Purpose**: Provide contract, auth, routing, state, UI-state, and quality foundations
used by every story.

**Critical**: No user-story implementation begins until this phase passes.

### Tests First

- [x] T015 [P] Add failing OpenAPI surface/drift tests for consumed `/api/v1` operations, paging, ETags, RFC 7807, and live-only metadata in `tests/contract/openapi-surface.contract.test.ts`
- [x] T016 [P] Add failing normalized error-matrix tests for 400/401/402/403/404/409/423/429/5xx and trace IDs in `src/shared/api/errors/app-problem.test.ts`
- [x] T017 [P] Add failing session refresh, scope transition, and register-lock tests in `src/shared/auth/session-manager.test.ts`
- [x] T018 [P] Add failing permission/location/plan/register/connectivity guard tests in `src/shared/auth/access-policy.test.ts`
- [x] T019 [P] Add failing tenant/location/register-aware query-key and cache-clearing tests in `src/shared/api/client/query-scope.test.ts`
- [x] T020 [P] Add failing decimal money/quantity, Ghana display, and UTC/business-time tests in `src/shared/money/decimal.test.ts` and `src/shared/utils/date-time.test.ts`
- [x] T021 [P] Add failing loading/empty/validation/denial/stale/approval/read-only/rate-limit state tests in `src/shared/ui/states/ui-state.test.tsx`
- [x] T022 [P] Add failing shell keyboard, focus restoration, 320px overflow, reduced-motion, and error-boundary tests in `src/app/app-shell.test.tsx`
- [x] T023 [P] Add failing service-worker app-shell-only and API-NetworkOnly policy tests in `src/app/service-worker.test.ts`

### Implementation

- [x] T024 Capture the reviewed InventoryX provider document in `openapi/inventoryx-v1.json` and add deterministic `api:generate`/`api:check` scripts to `package.json` and `scripts/openapi-check.mjs`
- [x] T025 Generate read-only API types in `src/shared/api/generated/` and implement the single openapi-fetch transport entry in `src/shared/api/client/inventoryx-client.ts`
- [x] T026 Implement RFC 7807 runtime schemas, normalized `AppProblem`, retry classification, trace-ID scrubbing, and field-error mapping in `src/shared/api/errors/app-problem.ts`
- [x] T027 Implement memory-first user sessions, single-flight refresh, scope teardown, and register credential boundary in `src/shared/auth/session-manager.ts` and `src/shared/auth/session-context.tsx`
- [x] T028 Implement permission/location/plan/read-only/register/connectivity policy selectors in `src/shared/auth/access-policy.ts`
- [x] T029 Implement TanStack Router root/public/protected route trees and guard composition in `src/app/router.tsx`, `src/routes/__root.tsx`, and `src/routes/_authenticated.tsx`
- [x] T030 Implement scoped TanStack Query provider, key factories, cancellation, ETag metadata, and cache teardown in `src/app/providers/query-provider.tsx` and `src/shared/api/client/query-scope.ts`
- [x] T031 Implement Decimal.js helpers, decimal-string schemas, currency/quantity formatting, and UTC display utilities in `src/shared/money/decimal.ts` and `src/shared/utils/date-time.ts`
- [x] T032 Implement trust-boundary Zod helpers for API, URL, IndexedDB, worker, and BroadcastChannel messages in `src/shared/api/client/boundary-schema.ts`
- [x] T033 Implement standardized UI states, support-reference display, confirmation/focus primitives, and route/feature error boundaries in `src/shared/ui/states/` and `src/app/providers/error-boundary.tsx`
- [x] T034 Implement design tokens, responsive authenticated shell, accessible navigation, location context, stable controls, and audited base primitives in `src/app/styles.css`, `src/shared/ui/`, and `src/app/providers/app-shell.tsx`
- [x] T035 Implement a scrubbed telemetry boundary for errors, Web Vitals, route timing, sync state, storage pressure, and trace IDs in `src/shared/telemetry/telemetry.ts` and `src/app/providers/telemetry-provider.tsx`
- [x] T036 Implement the custom Workbox service worker, update deferral hooks, shell precache, navigation fallback, and NetworkOnly API policy in `src/app/service-worker.ts` and `src/app/providers/pwa-provider.tsx`
- [x] T037 Implement MSW browser/node handlers from generated contracts and provider-state factories in `src/shared/test/msw/` and `tests/fixtures/provider/`
- [x] T038 Wire all providers, generated routes, global announcements, and PWA registration in `src/main.tsx` and `src/app/providers/app-providers.tsx`
- [x] T039 Run the foundational red-green suite and record frozen install, format, lint, typecheck, coverage, OpenAPI, build, shell accessibility, and NetworkOnly results in `specs/001-inventory-pos-frontend/validation/foundation.md`

**Checkpoint**: Foundation passes all gates with no feature behavior implemented by
hand-written legacy services.

---

## Phase 3: User Story 1 - Onboard and Complete the First Sale (Priority: P1) MVP

**Goal**: A new owner registers, configures a location/product/opening stock/register,
opens a shift, completes one online sale, and sees stock decrease.

**Independent Test**: Register a fresh tenant, create one product with stock 10, sell 2,
then verify final receipt, sale history, checklist state, and stock 8.

### Tests First

- [x] T040 [P] [US1] Add failing auth/tenant/location/product/import/register/shift/sale/receipt contract tests in `tests/contract/us1-first-sale.contract.test.ts`
- [x] T041 [P] [US1] Add failing registration, login, Google, 2FA, onboarding checklist, profile, and sample-data component tests in `src/features/auth/us1-auth.test.tsx` and `src/features/onboarding/onboarding.test.tsx`
- [x] T042 [P] [US1] Add failing manual product, import mapping/preview, opening-stock, and location form tests in `src/features/catalogue/us1-catalogue.test.tsx` and `src/features/inventory/opening-stock.test.tsx`
- [x] T043 [P] [US1] Add failing online first-sale integration tests for shift, cart, payment, receipt, history, and stock invalidation in `src/features/pos/first-sale.integration.test.tsx`
- [x] T044 [P] [US1] Add the failing end-to-end onboarding-through-first-sale journey in `tests/e2e/us1-first-sale.spec.ts`
- [x] T045 [P] [US1] Add failing 320/768/1440, keyboard, 200% zoom, focus, and axe checks for US1 in `tests/e2e/us1-first-sale.accessibility.spec.ts`

### Implementation

- [x] T046 [P] [US1] Implement registration, login, Google callback, refresh recovery, 2FA challenge, and sign-out routes in `src/features/auth/` and `src/routes/auth/`; enrollment and recovery settings are owned by US9
- [x] T047 [P] [US1] Implement tenant profile, onboarding progress, trial/usage summary, and sample-data actions in `src/features/onboarding/` and `src/routes/_authenticated/onboarding.tsx`
- [x] T048 [P] [US1] Implement location queries/forms/selection with plan and ETag handling in `src/features/inventory/locations/` and `src/routes/_authenticated/locations/`
- [x] T049 [P] [US1] Add failing category list/create/rename/reparent/deactivate and cycle-prevention tests in `src/features/catalogue/categories/categories.test.tsx`
- [x] T050 [US1] Implement category maintenance with cycle and descendant-parent guards in `src/features/catalogue/categories/` and `src/routes/_authenticated/catalogue/categories.tsx`
- [x] T051 [P] [US1] Implement product list/detail/manual create schemas and forms for Simple and Variant modes, plus Batch mode field stubs only (manufacture, expiry, FEFO, and damage/saleable validation are completed in US10); category selection uses T050 records in `src/features/catalogue/products/` and `src/routes/_authenticated/catalogue/`
- [x] T052 [P] [US1] Implement CSV/XLSX upload, detected-column matching, full preview, row errors, commit summary, and abandon flow in `src/features/catalogue/import/` and `src/routes/_authenticated/catalogue/import.tsx`
- [x] T053 [P] [US1] Implement opening-stock upload/manual adjustment and per-location outcome UI in `src/features/inventory/opening-stock/`
- [x] T054 [US1] Implement register creation/selection and online opening-float shift start required by first sale in `src/features/registers/registers/` and `src/features/registers/shifts/open-shift.tsx`
- [x] T055 [US1] Implement the minimal online cart, product acquisition, cash checkout, duplicate-submit guard, and server-authoritative totals in `src/features/pos/cart/` and `src/features/pos/checkout/online-checkout.ts`
- [x] T056 [US1] Implement final receipt print view, sale history link, stock refresh, and onboarding completion in `src/features/pos/receipts/`, `src/features/pos/sales/`, and `src/features/onboarding/completion.ts`
- [x] T057 [P] [US1] Add failing receipt-template maintenance tests for logo, business/tax details, footer, return policy, preview, validation, and permission states in `src/features/pos/receipts/receipt-template.test.tsx`
- [x] T058 [US1] Implement receipt-template settings, preview, validation, and save/error states against the InventoryX contract in `src/features/pos/receipts/receipt-template.tsx` and `src/routes/_authenticated/settings/receipts.tsx` (`/settings/receipts`)
- [x] T059 [P] [US1] Add failing business-profile, valuation-confirmation, and approval-threshold tests in `src/features/settings/business/business-settings.test.tsx`
- [x] T060 [US1] Implement business profile, valuation confirmation, and approval-threshold settings in `src/features/settings/business/` and `src/routes/_authenticated/settings/business.tsx` (`/settings/business`)
- [x] T061 [US1] Compose the responsive first-sale route without nested cards or context-switching in `src/routes/_authenticated/pos.tsx` and `src/features/pos/pos-workspace.tsx`; US2 T077 extends this workspace rather than replacing it
- [x] T062 [US1] Run Quickstart Scenario A and record focused red/green commands, backend IDs, responsive/a11y evidence, and stock 10-to-8 result in `specs/001-inventory-pos-frontend/validation/us1-first-sale.md`
- [x] T063 [US1] Run representative-owner usability validation for sign-up through first sale using `specs/001-inventory-pos-frontend/validation/usability-protocol.md` and record results in `specs/001-inventory-pos-frontend/validation/usability-us1.md`

**Checkpoint**: US1 is a deployable online MVP independent of later advanced workflows.

---

## Phase 4: User Story 2 - Fast Counter Sale and Return (Priority: P2)

**Goal**: Cashiers scan/search/favourite items, hold/recall carts, use discounts and
split tenders, deliver receipts, and complete returns/exchanges.

**Independent Test**: Ring three products through scan/search/favourites, split Cash and
Card, print/deliver receipt, return one line, and exchange another.

### Tests First

- [x] T064 [P] [US2] Add failing products/barcode/favourites/held/sale/receipt/return/exchange/void contract tests in `tests/contract/us2-pos.contract.test.ts`
- [x] T065 [P] [US2] Add failing cart reducer tests for scan dedupe, quantities, fractional rules, discounts, totals, tenders, and duplicate completion in `src/features/pos/cart/cart-reducer.test.ts`
- [x] T066 [P] [US2] Add failing hardware/camera scanner, typo search, favourites, unknown-barcode no-match, authorized manual-create path, no shared-catalogue enrichment, and camera-denial/fallback component tests in `src/features/pos/acquisition/product-acquisition.test.tsx`
- [x] T067 [P] [US2] Add failing held-sale, split-tender, change, approval, checkout state, and held-sale recall after price/tax/availability/active-status change tests in `src/features/pos/checkout/checkout.test.tsx`
- [x] T068 [P] [US2] Add failing receipt delivery, lookup, return disposition, refund threshold, exchange, and void component tests in `src/features/pos/after-sale/after-sale.test.tsx`
- [x] T069 [P] [US2] Add failing full counter-sale/return/exchange end-to-end coverage in `tests/e2e/us2-counter-sale.spec.ts`
- [x] T070 [P] [US2] Add failing POS 320/768/1440, keyboard-wedge, camera denial, focus, axe, print, and barcode-to-cart p95 200 ms timing checks in `tests/e2e/us2-pos-quality.spec.ts`

### Implementation

- [x] T071 [US2] Implement the typed cart reducer/store and selectors in `src/features/pos/cart/cart-store.ts`
- [x] T072 [P] [US2] Implement hardware keyboard-wedge scan buffering/deduplication in `src/features/pos/acquisition/hardware-scanner.ts`
- [x] T073 [P] [US2] Implement explicit camera permission, native enhancement, ZXing fallback, and teardown in `src/features/pos/acquisition/camera-scanner.tsx`
- [x] T074 [P] [US2] Implement online typo-tolerant search plus accessible combobox results in `src/features/pos/acquisition/product-search.tsx`
- [x] T075 [P] [US2] Implement unknown-barcode no-match result and authorized manual product-create path without claiming shared-catalogue enrichment in `src/features/pos/acquisition/unknown-barcode.tsx`
- [x] T076 [P] [US2] Implement configurable favourites pages/grid and register layout editing in `src/features/pos/acquisition/favourites-grid.tsx` and `src/features/registers/favourites/`
- [x] T077 [US2] Extend the US1 POS workspace with stable desktop/mobile cart lines, quantity/discount/note controls, totals, and live-only availability in `src/features/pos/pos-workspace.tsx`
- [x] T078 [P] [US2] Implement multi-hold list/create/recall/complete flows with stale price/tax/availability recovery on recall in `src/features/pos/held-sales/`
- [x] T079 [US2] Implement Cash/Card/MobileMoney/BankTransfer/Cheque split payment, change, approval pause, and idempotent completion in `src/features/pos/checkout/payment-panel.tsx`
- [x] T080 [P] [US2] Implement structured final receipt print/email/SMS/QR delivery and delivery-result states in `src/features/pos/receipts/`
- [x] T081 [US2] Implement sale lookup, eligible return quantities, ToStock/Quarantine, Original/Cash refund, authorization, exchange net settlement, and void in `src/features/pos/after-sale/`
- [x] T082 [US2] Run Quickstart Scenario C and record E2E, accessibility, print, scanner, timing, and server-authoritative results in `specs/001-inventory-pos-frontend/validation/us2-counter-sale.md`
- [x] T083 [US2] Run representative-cashier usability validation for the primary counter-sale task using `specs/001-inventory-pos-frontend/validation/usability-protocol.md` and record results in `specs/001-inventory-pos-frontend/validation/usability-us2.md`

**Checkpoint**: US2 independently proves the complete online counter lifecycle.

---

## Phase 5: User Story 3 - Control Stock Across Locations (Priority: P3)

**Goal**: Managers and stock staff view rollups, movements, adjustments, consumption,
transfers, counts, alerts, and reorder suggestions with permanent approval history.

**Independent Test**: Dispatch 10, receive 8 with discrepancy, submit/approve a spot
count, and verify append-only movement/correction records.

### Tests First

- [x] T084 [P] [US3] Add failing stock/movement/adjustment/transfer/count/consumption/alert/reorder contract tests in `tests/contract/us3-inventory.contract.test.ts`
- [x] T085 [P] [US3] Add failing stock rollup/filter/profit-field and movement-correction component tests in `src/features/inventory/stock/stock.test.tsx`
- [x] T086 [P] [US3] Add failing adjustment/transfer/count state, requester-approver separation, discrepancy, and stale ETag tests in `src/features/inventory/workflows/inventory-workflows.test.tsx`
- [x] T087 [P] [US3] Add failing transfer/count/adjustment end-to-end journey in `tests/e2e/us3-stock-control.spec.ts`
- [x] T088 [P] [US3] Add failing mobile count scanning, dense-table responsive, keyboard, focus, 200% zoom, and axe tests in `tests/e2e/us3-stock-quality.spec.ts`

### Implementation

- [x] T089 [P] [US3] Implement paged location/product/category/reorder/expiry stock queries and business-wide rollup in `src/features/inventory/stock/`
- [x] T090 [P] [US3] Implement append-only movement filters, original/correction links, and manager correction flow in `src/features/inventory/movements/`
- [x] T091 [P] [US3] Implement multi-line reasoned adjustments, pending approval, different-approver enforcement, approve/reject, and ETag recovery in `src/features/inventory/adjustments/`
- [x] T092 [P] [US3] Implement draft/dispatch/in-transit/receive/discrepancy transfer workflow in `src/features/inventory/transfers/`
- [x] T093 [P] [US3] Implement full/cycle/spot count scope, incremental lines, variances, submit, approve/reject, and permanent record in `src/features/inventory/counts/`
- [x] T094 [US3] Reuse the scanner boundary for phone count entry without POS focus behavior in `src/features/inventory/counts/count-scanner.tsx`
- [x] T095 [P] [US3] Implement adjustment reasons and internal-consumption recording in `src/features/inventory/consumption/`
- [x] T096 [P] [US3] Implement low/out/expiry/overstock/slow-moving alert views, filters, and tenant-threshold edit only when the InventoryX contract exposes that threshold; otherwise show the provider-defined rule as read-only in `src/features/inventory/alerts/`
- [x] T097 [P] [US3] Implement supplier-grouped reorder suggestion read/review UI without PO creation in `src/features/inventory/reorder/reorder-suggestions.tsx`
- [x] T098 [US3] Enforce location scope and remove cost/profit/valuation fields when ViewProfit is absent across `src/features/inventory/` (stock-view application of FR-078)
- [x] T099 [US3] Compose inventory routes and detail navigation in `src/routes/_authenticated/inventory/`
- [x] T100 [US3] Run Quickstart Scenario E stock portion and record stock, approval, movement, mobile, and accessibility results in `specs/001-inventory-pos-frontend/validation/us3-stock-control.md`

**Checkpoint**: US3 independently proves multi-location ledger integrity.

---

## Phase 6: User Story 4 - Keep Selling During Connectivity Loss (Priority: P4)

**Goal**: A prepared open register sells durably offline, issues provisional receipts,
recovers after restart/sign-out, synchronizes exactly once, and exposes
`applied_with_conflict` outcomes or manager-locked rejections.

**Independent Test**: Prepare/open online, queue 100 sales offline, restart and lock/
unlock the same register, reconnect, and verify `applied` / `applied_with_conflict` /
`rejected` outcomes, overlay retirement, receipts, and 12-hour cutoff.

**External Gate**: T101-T110 MUST pass against InventoryX before production integration
tasks T128-T133 can be considered complete. Fixture-only progress does not waive this.
These InventoryX paths are relative to the InventoryMS repository root.

### Provider Contract Tests First

- [x] T101 [P] [US4] Add failing consumer tests for register-token route/register scope, fiscal snapshot evidence, rejected reconciliation, and complete preparation data in `tests/contract/us4-offline-provider.contract.test.ts`
- [x] T102 [P] [US4] Add failing InventoryX register-token policy tests in `../InventoryX/tests/InventoryX.Presentation.Tests/Middleware/RegisterTokenAuthorizationTests.cs`
- [x] T103 [P] [US4] Add failing InventoryX historical offline price/tax acceptance tests in `../InventoryX/tests/InventoryX.Application.Tests/Sync/OfflineFiscalSnapshotTests.cs`
- [x] T104 [P] [US4] Add failing InventoryX complete snapshot/tombstone or versioned preparation-bundle tests in `../InventoryX/tests/InventoryX.Application.Tests/Sync/SyncSnapshotCompletenessTests.cs`
- [x] T105 [P] [US4] Add failing InventoryX rejected-sale review/retry/reconciliation tests in `../InventoryX/tests/InventoryX.Application.Tests/Sync/RejectedSaleReconciliationTests.cs`

### Provider Readiness Implementation

- [x] T106 [US4] Implement and register a sync-only, matching-register token authorization policy in `../InventoryX/InventoryX.Presentation/Authorization/RegisterTokenAuthorizationHandler.cs` and `../InventoryX/InventoryX.Presentation/Controllers/v1/SyncController.cs`
- [x] T107 [US4] Extend offline sale commands/ingest to accept and audit authoritative historical price/tax snapshot evidence in `../InventoryX/InventoryX.Application/Commands/Requests/Sync/IngestOfflineSalesCommand.cs` and `../InventoryX/InventoryX.Application/Commands/RequestHandlers/Sync/IngestOfflineSalesCommandHandler.cs`
- [x] T108 [US4] Reconcile snapshot DTO/handler with favourites, receipt template, fractional/tracking/discount/live-only data and deletion/version semantics in `../InventoryX/InventoryX.Application/Queries/Requests/Sync/GetSyncSnapshotQuery.cs` and `../InventoryX/InventoryX.Application/Queries/RequestHandlers/Sync/GetSyncSnapshotQueryHandler.cs`
- [x] T109 [US4] Implement authoritative manager review, retry release or linked reconciliation, audit, and controller contract in `../InventoryX/InventoryX.Application/Commands/Requests/Sync/ResolveRejectedOfflineSaleCommand.cs` and `../InventoryX/InventoryX.Presentation/Controllers/v1/SyncController.cs`
- [x] T110 [US4] Update reviewed offline contracts/provider tests and regenerate the frontend snapshot in `../InventoryX/specs/001-inventory-pos-platform/contracts/pos-sales-sync.md`, `../InventoryX/tests/InventoryX.Presentation.Tests/Swagger/ContractSurfaceTests.cs`, and `openapi/inventoryx-v1.json`

### Frontend Tests First

- [x] T111 [P] [US4] Add failing Dexie schema/upgrade/full-replacement/partition/quota tests in `src/shared/db/register-database.test.ts`
- [x] T112 [P] [US4] Add failing atomic envelope/hash/overlay/effective-stock and crash-point tests in `src/features/offline-sync/offline-sale-repository.test.ts`
- [x] T113 [P] [US4] Add failing Web Crypto wrapping, sign-out lock, same-register unlock, cross-scope denial, and deadline tests in `src/shared/auth/register-authorization.test.ts`
- [x] T114 [P] [US4] Add failing leader/lease/retry/idempotency/result/snapshot-merge/rejection state tests in `src/features/offline-sync/sync-coordinator.test.ts`
- [x] T115 [P] [US4] Add failing provisional/final receipt separation and QR payload tests in `src/features/pos/receipts/offline-receipt.test.tsx`
- [x] T116 [P] [US4] Add failing real-browser service-worker, IndexedDB reload/restart, multi-tab, sign-out lock, storage pressure, and update-deferral tests in `tests/e2e/us4-offline-browser.spec.ts`
- [x] T117 [P] [US4] Add failing 100-sale, ambiguous replay, `applied`/`applied_with_conflict`/`rejected`, overlay merge, and 12-hour provider E2E tests in `tests/e2e/us4-offline-provider.spec.ts`
- [x] T118 [P] [US4] Add failing offline status/review 320/768/1440, keyboard, focus, 200% zoom, and axe tests in `tests/e2e/us4-offline-quality.spec.ts`
- [x] T119 [P] [US4] Add failing stock-conflict review tests for `acceptAsIs` and `adjustWithReason` resolution in `src/features/offline-sync/stock-conflict-review/stock-conflict-review.test.tsx`

### Frontend Implementation

- [x] T120 [US4] Implement versioned tenant/register Dexie schema, typed repositories, fixture migrations, partition locks, and storage estimates in `src/shared/db/register-database.ts`
- [x] T121 [US4] Implement non-extractable device-key wrapping, reduced register credential persistence, same-register unlock, scope teardown, and effective deadline in `src/shared/auth/register-authorization.ts`
- [x] T122 [US4] Implement online full preparation, atomic snapshot replacement, watermark metadata, completeness validation, and shift binding in `src/features/offline-sync/prepare-register.ts`
- [x] T123 [US4] Implement immutable offline completion transaction, canonical payload/hash, stock overlays, quota failure, and cart preservation in `src/features/offline-sync/offline-sale-repository.ts`
- [x] T124 [P] [US4] Implement MiniSearch indexes, exact barcode indexes, and effective availability from snapshot minus active overlays in `src/features/offline-sync/offline-catalogue.ts`
- [x] T125 [P] [US4] Implement immutable provisional `Pending sync` print/QR receipt and separate final receipt reference in `src/features/pos/receipts/offline-receipt.tsx`
- [x] T126 [US4] Implement single-tab Web Lock leadership, BroadcastChannel status, leases, stale recovery, bounded batches, and trigger scheduling in `src/features/offline-sync/sync-leader.ts`
- [x] T127 [US4] Implement retry classification/backoff, same-identity upload, per-sale result matching, auth stop, and telemetry in `src/features/offline-sync/sync-coordinator.ts`
- [x] T128 [US4] Integrate accepted provider fiscal/snapshot contract, post-apply snapshot merge, overlay retirement, final receipt fetch, and `applied_with_conflict` state in `src/features/offline-sync/apply-sync-result.ts`
- [x] T129 [US4] Implement immutable manager-only rejected-sale review, retry release, linked reconciliation, and audit display against the accepted provider contract in `src/features/offline-sync/rejected-sale-review/`
- [x] T130 [US4] Implement open stock-conflict review and resolution (`acceptAsIs` or reasoned adjustment) in `src/features/offline-sync/stock-conflict-review/` and compose `src/routes/_authenticated/offline/review.tsx`
- [x] T131 [US4] Extend the T130 `/offline/review` route with persistent offline/pending count, live-only disabling, readiness/deadline guard, update prompt, and recovery UI in `src/features/offline-sync/offline-status.tsx` and `src/routes/_authenticated/offline/review.tsx`
- [x] T132 [US4] Implement storage-pressure cleanup order and incompatible service-worker/database update deferral in `src/shared/db/storage-pressure.ts` and `src/app/providers/pwa-provider.tsx`
- [x] T133 [US4] Run Quickstart Scenario D against the provider, record all gate/test evidence, and leave P4 blocked unless T101-T132 pass in `specs/001-inventory-pos-frontend/validation/us4-offline.md`

**Checkpoint**: US4 is complete only with provider and client evidence; fixture-only
success is explicitly incomplete.

---

## Phase 7: User Story 5 - Manage Subscription and Business Data (Priority: P5)

**Goal**: Owners understand and self-manage plans, trial, usage, payment method,
invoices, cancellation/reactivation, read-only recovery, and full export.

**Independent Test**: Exercise trial, upgrade, downgrade acknowledgement, grace/read-
only, invoice download, cancellation/reactivation, and data export.

### Tests First

- [x] T134 [P] [US5] Add failing plans/subscription/upgrade/downgrade/cancel/reactivate/payment/contact/invoice/export contract tests in `tests/contract/us5-billing.contract.test.ts`
- [x] T135 [P] [US5] Add failing plan comparison, usage, downgrade exceedance, grace/read-only, and billing form component tests in `src/features/billing/billing.test.tsx`
- [x] T136 [P] [US5] Add failing billing/data-control end-to-end journey in `tests/e2e/us5-billing.spec.ts`
- [x] T137 [P] [US5] Add failing billing 320/768/1440, keyboard, focus, confirmation, and axe tests in `tests/e2e/us5-billing-quality.spec.ts`

### Implementation

- [x] T138 [P] [US5] Implement public plans and owner subscription/usage query clients in `src/features/billing/api/billing-queries.ts`
- [x] T139 [P] [US5] Implement plan comparison, trial/status/deadline, and usage-limit routes in `src/features/billing/plans/` and `src/routes/plans.tsx`
- [x] T140 [US5] Implement immediate upgrade and acknowledged period-end downgrade flows in `src/features/billing/subscription/change-plan.tsx`
- [x] T141 [US5] Implement cancellation warnings, retention timeline, and reactivation in `src/features/billing/subscription/cancellation.tsx`
- [x] T142 [P] [US5] Implement card/Ghana mobile-money billing method initialization and billing contact/tax fields in `src/features/billing/payment-method/`
- [x] T143 [P] [US5] Implement invoice history/PDF and full data export job progress/download in `src/features/billing/invoices/` and `src/features/settings/data-export/`
- [x] T144 [US5] Integrate global 402 plan-limit/read-only recovery while preserving view/billing/export routes in `src/app/providers/subscription-gate.tsx`
- [x] T145 [US5] Run Quickstart Scenario F billing portion and record all subscription/data-control results in `specs/001-inventory-pos-frontend/validation/us5-billing.md`

**Checkpoint**: US5 independently proves owner self-service and non-hostage data access.

---

## Phase 8: User Story 6 - Reconcile a Register Shift (Priority: P6)

**Goal**: Cashiers open with float, record cash movement, close with counted cash, and
view variance/Z report with manager escalation.

**Independent Test**: Open, sell, cash-out, close with a count, and verify expected,
counted, variance, tender, refund, discount, and void totals.

### Tests First

- [x] T146 [P] [US6] Add failing registers/favourites/shifts/cash-movements/close/Z-report contract tests in `tests/contract/us6-register-shift.contract.test.ts`
- [x] T147 [P] [US6] Add failing opening-float, duplicate-open, cash reason, counted-close, variance, and report component tests in `src/features/registers/shifts/shift.test.tsx`
- [x] T148 [P] [US6] Add failing shift reconciliation end-to-end journey in `tests/e2e/us6-register-shift.spec.ts`
- [x] T149 [P] [US6] Add failing shift 320/768/1440, keyboard, focus, confirmation, report table, and axe tests in `tests/e2e/us6-shift-quality.spec.ts`

### Implementation

- [x] T150 [P] [US6] Implement register list/create/update and plan-limit states in `src/features/registers/registers/`
- [x] T151 [US6] Expand open-shift flow with duplicate-open conflict and counted denomination support in `src/features/registers/shifts/open-shift.tsx`
- [x] T152 [P] [US6] Implement CashIn/CashOut movements with PettyCash/Banking/ChangeOrder/Other reasons in `src/features/registers/shifts/cash-movement.tsx`
- [x] T153 [US6] Implement required closing count, expected/count/variance review, confirmation, and manager flag in `src/features/registers/shifts/close-shift.tsx`
- [x] T154 [US6] Implement permission-sensitive Z report and print layout in `src/features/registers/shifts/z-report.tsx`
- [x] T155 [US6] Run Quickstart cash reconciliation and record duplicate-open, variance, report, responsive, and a11y evidence in `specs/001-inventory-pos-frontend/validation/us6-register-shift.md`
- [x] T156 [US6] Run representative-manager and cashier usability validation for shift reconciliation using `specs/001-inventory-pos-frontend/validation/usability-protocol.md` and record results in `specs/001-inventory-pos-frontend/validation/usability-us6.md`

**Checkpoint**: US6 independently proves register cash accountability.

---

## Phase 9: User Story 7 - Replenish and Receive Stock (Priority: P7)

**Goal**: Purchasing users manage suppliers, convert suggestions to approved orders,
receive actual/damaged stock, close short, match invoices, and allocate landed costs.

**Independent Test**: Create supplier/order from suggestion, approve/send, partial
receive with damage/batch, close short, flag invoice difference, and allocate costs.

### Tests First

- [x] T157 [P] [US7] Add failing supplier/reorder/PO/approval/PDF/receipt/invoice/landed-cost contract tests in `tests/contract/us7-purchasing.contract.test.ts`
- [x] T158 [P] [US7] Add failing purchase-order transition/ETag/approval/close-short unit tests in `src/features/purchasing/orders/purchase-order-state.test.ts`
- [x] T159 [P] [US7] Add failing supplier/order/receipt/invoice/landed-cost component tests in `src/features/purchasing/purchasing.test.tsx`
- [x] T160 [P] [US7] Add failing replenishment-through-receipt end-to-end journey in `tests/e2e/us7-purchasing.spec.ts`
- [x] T161 [P] [US7] Add failing purchasing 320/768/1440, keyboard, dense table/form, confirmation, and axe tests in `tests/e2e/us7-purchasing-quality.spec.ts`

### Implementation

- [x] T162 [P] [US7] Implement supplier list/create/edit, terms, lead time, currency, and performance in `src/features/purchasing/suppliers/`
- [x] T163 [P] [US7] Implement supplier products/codes/prices and supplier order history in `src/features/purchasing/suppliers/supplier-products.tsx`
- [x] T164 [US7] Implement selection/application of reorder suggestions into supplier-grouped draft orders in `src/features/purchasing/reorder/create-orders.tsx`
- [x] T165 [US7] Implement paged PO list, filters, draft form/lines, origins, ETag edits, and totals in `src/features/purchasing/orders/`
- [x] T166 [US7] Implement submit/approval/rejection/cancel state actions with threshold and reason handling in `src/features/purchasing/orders/order-actions.tsx`
- [x] T167 [P] [US7] Implement supplier email/download PO document states in `src/features/purchasing/orders/order-document.tsx`
- [x] T168 [US7] Implement actual/damaged/outstanding goods receipt and partial/full state in `src/features/purchasing/receipts/goods-receipt.tsx`
- [x] T169 [US7] Implement required batch number/manufacture/expiry capture during receipt; damaged-versus-saleable distinction is completed in US10 in `src/features/purchasing/receipts/batch-lines.tsx`
- [x] T170 [US7] Implement close-short confirmation and required reason in `src/features/purchasing/orders/close-short.tsx`
- [x] T171 [P] [US7] Implement supplier invoice matching and line price-difference review in `src/features/purchasing/invoices/`
- [x] T172 [P] [US7] Implement freight/duty/clearing/insurance allocation and resulting true-cost display in `src/features/purchasing/landed-costs/`
- [x] T173 [US7] Compose purchasing routes and permission/plan gates in `src/routes/_authenticated/purchasing/`
- [x] T174 [US7] Run Quickstart Scenario E purchasing portion and record approval/state/cost/responsive/a11y results in `specs/001-inventory-pos-frontend/validation/us7-purchasing.md`

**Checkpoint**: US7 independently proves replenishment and receiving control.

---

## Phase 10: User Story 8 - Monitor Performance and Alerts (Priority: P8)

**Goal**: Managers use linked dashboard metrics, filtered standard reports, exports,
schedules, and actionable notification preferences.

**Independent Test**: Follow every dashboard metric, filter six reports, export/schedule
one, and manage/read consolidated notifications under profit/no-profit roles.

### Tests First

- [x] T175 [P] [US8] Add failing dashboard/report/export/schedule/notification/preferences contract tests in `tests/contract/us8-reporting.contract.test.ts`
- [x] T176 [P] [US8] Add failing dashboard detail-link/filter/profit-field/report table/chart component tests in `src/features/reports/reporting.test.tsx`
- [x] T177 [P] [US8] Add failing export-job/schedule/notification occurrence/read/preference component tests in `src/features/notifications/notifications.test.tsx`
- [x] T178 [P] [US8] Add failing dashboard-through-report end-to-end journey in `tests/e2e/us8-reporting.spec.ts`
- [x] T179 [P] [US8] Add failing report 320/768/1440, chart table fallback, keyboard, 200% zoom, and axe tests in `tests/e2e/us8-reporting-quality.spec.ts`

### Implementation

- [x] T180 [US8] Implement dashboard comparison metrics, warning counts, top sellers, and validated detail navigation in `src/features/reports/dashboard/`
- [x] T181 [P] [US8] Implement typed URL date/location/category/staff report filters and retained navigation state in `src/features/reports/filters/`
- [x] T182 [US8] Implement sales/profit/stock/purchasing/staff/Ghana-tax report tables and permission-sensitive columns in `src/features/reports/standard-reports/`
- [x] T183 [P] [US8] Implement lazy Recharts views with accessible summaries/table equivalents in `src/features/reports/charts/`
- [x] T184 [P] [US8] Implement CSV/XLSX/PDF export start/poll/failure/expiry/download states in `src/features/reports/exports/`
- [x] T185 [P] [US8] Implement Daily/Weekly/Monthly report schedules, recipients, list/detail, and deactivate in `src/features/reports/schedules/`
- [x] T186 [P] [US8] Implement paged consolidated notification feed, unread count, read-one, and read-all in `src/features/notifications/feed/`
- [x] T187 [P] [US8] Implement InApp/Email/Push/Sms channel matrix and supported thresholds in `src/features/notifications/preferences/`; Cycle 1 persists the Push preference flag only, and InventoryX owns push delivery
- [x] T188 [US8] Compose dashboard/report/notification routes with ViewReports/ViewProfit gates in `src/routes/_authenticated/reports/` and `src/routes/_authenticated/notifications/`
- [x] T189 [US8] Run Quickstart Scenario F reporting portion and record links, filters, permissions, exports, schedules, notifications, responsive/a11y results in `specs/001-inventory-pos-frontend/validation/us8-reporting.md`

**Checkpoint**: US8 independently proves management visibility without exposing
forbidden financial data.

---

## Phase 11: User Story 9 - Administer Staff and Sensitive Access (Priority: P9)

**Goal**: Owners/admins invite and scope staff, manage active state/PIN/2FA, and review
sensitive actions without violating sole-owner or open-shift rules.

**Independent Test**: Invite a location-scoped cashier, accept/set PIN, verify allowed
and forbidden routes/data, trigger sensitive actions, and inspect audit history.

### Tests First

- [x] T190 [P] [US9] Add failing users/invitations/roles/PIN/2FA/audit contract tests in `tests/contract/us9-staff.contract.test.ts`
- [x] T191 [P] [US9] Add failing role/permission/location/scope-change/query-clearing tests in `src/features/staff/staff-access.test.ts`
- [x] T192 [P] [US9] Add failing invite/edit/deactivate/PIN/2FA/audit/sole-owner/open-shift component tests in `src/features/staff/staff.test.tsx`
- [x] T193 [P] [US9] Add failing staff administration end-to-end journey in `tests/e2e/us9-staff.spec.ts`
- [x] T194 [P] [US9] Add failing staff 320/768/1440, keyboard, focus, sensitive confirmation, and axe tests in `tests/e2e/us9-staff-quality.spec.ts`

### Implementation

- [x] T195 [P] [US9] Implement paged staff list, role/permission explanations, active state, and scoped query client in `src/features/staff/users/`
- [x] T196 [P] [US9] Implement invitation create/limit/error and token acceptance flow in `src/features/staff/invitations/` and `src/routes/invite/accept.tsx`
- [x] T197 [US9] Implement fixed role/location edit, deactivation, scope teardown, sole-owner and open-shift recovery in `src/features/staff/access-editor/`
- [x] T198 [P] [US9] Implement set/replace write-only register PIN flow in `src/features/staff/register-pin/`
- [x] T199 [P] [US9] Implement user 2FA security settings and recovery-safe challenge UI in `src/features/settings/security/two-factor.tsx`
- [x] T200 [P] [US9] Implement paged sensitive audit history with actor/time/action/target/reason/support-safe metadata in `src/features/staff/audit-log/`
- [x] T201 [US9] Compose staff/audit/security routes with ManageUsers and owner/admin gates in `src/routes/_authenticated/staff/` and `src/routes/_authenticated/settings/security.tsx`
- [x] T202 [US9] Run the staff/access Quickstart checks and record tenant/location isolation, PIN/2FA, audit, responsive/a11y evidence in `specs/001-inventory-pos-frontend/validation/us9-staff.md`

**Checkpoint**: US9 independently proves least-privilege staff administration.

---

## Phase 12: User Story 10 - Track Batches and Expiry (Priority: P10)

**Goal**: Stock users create/receive batch products, understand FEFO/expiry, and trace
one batch backward to supply and forward to sales.

**Independent Test**: Receive two expiry-dated batches, sell, verify older-first issue,
raise expiry alert, and trace receipt/supplier/sales.

### Tests First

- [x] T203 [P] [US10] Add failing batch product/receipt/list/trace/expiry/FEFO contract tests in `tests/contract/us10-batch.contract.test.ts`
- [x] T204 [P] [US10] Add failing batch fields, FEFO display, expiry filters/alerts, damage, and trace component tests in `src/features/inventory/batches/batches.test.tsx`
- [x] T205 [P] [US10] Add failing batch receipt-through-trace end-to-end journey in `tests/e2e/us10-batch-trace.spec.ts`
- [x] T206 [P] [US10] Add failing batch 320/768/1440, scan, dense trace, keyboard, focus, and axe tests in `tests/e2e/us10-batch-quality.spec.ts`

### Implementation

- [x] T207 [P] [US10] Complete Batch tracking fields/validation (manufacture, expiry, FEFO defaults) left as stubs by US1 T051 in `src/features/catalogue/products/batch-product-fields.tsx`
- [x] T208 [P] [US10] Implement per-product batch list, remaining quantity, manufacture/expiry, and FEFO order in `src/features/inventory/batches/batch-list.tsx`
- [x] T209 [US10] Complete damaged-versus-saleable distinction and required expiry policy on the US7 receipt batch lines in `src/features/purchasing/receipts/batch-lines.tsx`
- [x] T210 [P] [US10] Implement expiry horizon filters and alert detail navigation in `src/features/inventory/batches/expiry-alerts.tsx`
- [x] T211 [US10] Implement recall trace from supplier/receipt through every affected sale in `src/features/inventory/batches/batch-trace.tsx`
- [x] T212 [US10] Compose batch list/detail/trace routes and ManageStock scope in `src/routes/_authenticated/inventory/batches/`
- [x] T213 [US10] Run batch Quickstart validation and record FEFO, damage, expiry, trace, responsive/a11y results in `specs/001-inventory-pos-frontend/validation/us10-batches.md`

**Checkpoint**: US10 independently proves Cycle 1 batch/expiry traceability.

---

## Phase 13: Polish and Cross-Cutting Release Gates

**Purpose**: Remove remaining prototype residue and prove the complete product across
contracts, browsers, devices, accessibility, security, performance, and operations.

- [x] T214 [P] Remove unused dependencies/primitives and confirm no Supabase, legacy endpoint, local-storage token, raw fetch, duplicate DTO, or dead route remains in `package.json`, `src/`, and `pnpm-lock.yaml`
- [x] T215 [P] Add strict CSP/Trusted Types deployment templates, camera-self policy, security headers, and tests in `public/_headers`, `tests/contract/security-headers.test.ts`, and `SECURITY.md`
- [x] T216 [P] Add service-worker/Dexie released-schema migration fixtures and mid-shift update tests in `tests/e2e/pwa-update.spec.ts` and `tests/fixtures/indexeddb/`
- [x] T217 [P] Add bundle/CWV/domain timing/Lighthouse budget automation in `tests/performance/`, `lighthouserc.cjs`, and `scripts/check-bundle-budget.mjs`
- [x] T218 [P] Add telemetry privacy allowlist/redaction tests and deployment guidance in `src/shared/telemetry/telemetry-privacy.test.ts` and `docs/telemetry.md`
- [x] T219 [P] Add targeted POS/table/dialog/receipt Playwright screenshot tests in `tests/visual/`
- [x] T220 Run all six Quickstart scenarios and store a consolidated evidence index in `specs/001-inventory-pos-frontend/validation/quickstart-complete.md`
- [x] T221 Run the full Chromium/Firefox/WebKit ten-story suite and record version/results in `specs/001-inventory-pos-frontend/validation/cross-browser.md`
- [x] T222 Run every critical route/state at 320x800, 768x1024, 1440x900 and 200% zoom with no page overflow in `specs/001-inventory-pos-frontend/validation/responsive.md`
- [x] T223 Run keyboard-only, zero-critical/serious axe, NVDA, and VoiceOver checks and record focus/screen-reader results in `specs/001-inventory-pos-frontend/validation/accessibility.md`
- [x] T224 Run real Android/iOS camera granted/denied, hardware scanner Enter suffix, receipt printing, PWA install/update, and outage recovery checks in `specs/001-inventory-pos-frontend/validation/devices.md`
- [x] T225 Run dependency/license/security audit and document accepted findings with owner/expiry in `specs/001-inventory-pos-frontend/validation/security-audit.md`
- [x] T226 Run all transfer, bundle, Core Web Vital, barcode, enqueue, queue-recovery, sale, and report performance gates in `specs/001-inventory-pos-frontend/validation/performance.md`
- [x] T227 Run frozen install, format, lint, strict typecheck, coverage, OpenAPI clean diff, production build, full E2E, accessibility, and performance commands and record output in `specs/001-inventory-pos-frontend/validation/final-quality-gates.md`
- [x] T228 Update setup, architecture, testing, offline limitations, browser support, and validation commands in `README.md`, `CONTRIBUTING.md`, and `docs/architecture.md`
- [x] T229 Confirm every legacy file in the migration inventory is deleted or explicitly justified and close the inventory in `specs/001-inventory-pos-frontend/migration-inventory.md`
- [x] T230 Perform final requirement-to-test traceability for UX-001..008, FR-001..090, and SC-001..018 and record P4 provider status in `specs/001-inventory-pos-frontend/validation/traceability.md`
- [x] T231 Block release unless all constitution gates and the InventoryX readiness gate pass, then record release approval, manual evidence links, and rollback reference in `specs/001-inventory-pos-frontend/validation/release-readiness.md`

---

## Dependencies and Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: no prerequisites; establishes the replacement toolchain.
2. **Foundational (Phase 2)**: depends on Setup and blocks all user stories.
3. **US1-US10 (Phases 3-12)**: each depends on Foundational. Story priority is the
   default order, but independent teams may use seeded fixtures and separate files.
4. **US4 provider integration**: T101-T110 are external prerequisites for T128-T133 and
   P4 release. Local offline tests/design can proceed while provider work is pending.
5. **Polish (Phase 13)**: begins after desired stories; T220-T231 require all ten.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 (MVP)
                    -> US2
                    -> US3
                    -> US5
                    -> US6
                    -> US8
                    -> US9

US3 -------------> US7 (reorder/stock integration; fixtures allow independent tests)
US7 -------------> US10 (goods-receipt integration; fixtures allow independent tests)

Foundation -> US4 local model/tests
InventoryX readiness T101-T110 -> US4 production integration T128-T133

US1..US10 -> Polish/Release
```

### Story Completion Criteria

| Story | Independent completion signal                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1   | Fresh tenant sells 2 of 10 and sees stock 8, final receipt, history, checklist                                                                                       |
| US2   | Scan/search/favourite split sale returns/exchanges correctly with approvals                                                                                          |
| US3   | Transfer/count/adjustment produces correct in-transit, variance, and append-only history                                                                             |
| US4   | 100 offline sales survive restart/lock, sync once, resolve `applied` / `applied_with_conflict` / `rejected` outcomes, and enforce 12 hours with provider gate passed |
| US5   | Owner completes trial/plan/read-only/invoice/cancel/reactivate/export lifecycle                                                                                      |
| US6   | Shift float/cash/close variance and Z report reconcile                                                                                                               |
| US7   | Suggestion becomes approved/received/closed-short order with invoice/landed cost                                                                                     |
| US8   | Dashboard/report/export/schedule/notification flow works without forbidden profit data                                                                               |
| US9   | Scoped invited cashier sees only allowed data/actions and sensitive audit is complete                                                                                |
| US10  | Two batches issue FEFO and trace from supplier receipt to sales                                                                                                      |

## Parallel Opportunities by Story

| Story | Parallel test/implementation examples after prerequisites                     |
| ----- | ----------------------------------------------------------------------------- |
| US1   | T040-T045 tests; T046-T048 and T051-T053 feature modules; T049 and T059       |
| US2   | T064-T070 tests; T072-T076 acquisition; T078 and T080                         |
| US3   | T084-T088 tests; T089-T093 workflows; T095-T097 supporting views              |
| US4   | T101-T105 provider tests; T111-T119 frontend tests; T124-T125 after T120-T123 |
| US5   | T134-T137 tests; T138-T139, T142-T143                                         |
| US6   | T146-T149 tests; T150 and T152                                                |
| US7   | T157-T161 tests; T162-T163; T167, T171-T172                                   |
| US8   | T175-T179 tests; T181, T183-T187                                              |
| US9   | T190-T194 tests; T195-T196, T198-T200                                         |
| US10  | T203-T206 tests; T207-T208, T210                                              |

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 only.
3. Stop and validate `validation/us1-first-sale.md` against a fresh InventoryX tenant.
4. Deploy the online MVP only if all gates pass; it does not claim offline capability.

### Incremental Delivery

1. Add US2 online counter operations.
2. Add US3 stock control.
3. Advance US4 local work and provider readiness in parallel; do not release it early.
4. Add US5-US10 in priority order, using fixtures to retain story-level independence.
5. Run Phase 13 only after the selected release scope is complete.

### TDD Rule for Every Task Group

1. Run the focused test task and record the expected missing-behavior failure.
2. Implement the smallest production change that makes it pass.
3. Refactor with the focused test green.
4. Run the affected layer, then the story checkpoint, then full merge gates.
5. Never treat skipped, retried, quarantined, fixture-only, or provider-blocked tests as
   completion evidence.

## Notes

- All 231 task IDs are sequential and unique for safe delegation.
- `[P]` means different files and no dependency on an unfinished adjacent task.
- Story labels map directly to the ten specification stories.
- Exact file paths are part of each task's acceptance boundary.
- InventoryX is authoritative; frontend inference never closes a provider readiness task.
- InventoryX provider tasks T101-T110 live in the sibling `../InventoryX` repository.
- Commit after each logical red-green-refactor group, not after every mechanical file.

## Phase 14: Convergence

> Generated by `/speckit-converge` after implement claimed T001–T231 complete. Append-only remediation for gaps between present code and spec/plan/constitution intent.

- [x] T232 CRITICAL Wire POS checkout (`payment-panel.tsx` / `pos-workspace.tsx`) to call `completeOfflineSale` for eligible offline completions with provisional receipt, instead of online-only `completeSale` / E2E bridge, per US4/AC1, FR-042 (partial)
- [x] T233 CRITICAL Clear the `pnpm lint --max-warnings=0` gate (currently 35 `@typescript-eslint` errors in US4 e2e specs) so merge quality commands pass per Constitution V, plan:quality commands (contradicts)
- [x] T234 Expose MobileMoney, BankTransfer, and Cheque tenders (including splits) in POS payment UI, not only Cash/Card, per FR-016 (partial)
- [x] T235 Surface live connectivity status and pending-sale count in the authenticated shell during POS without interrupting the sale, and bind real pending count into `OfflineStatusPanel` (stop hardcoding `pendingCount={0}` on `/offline/review`) per FR-041, UX-007 (partial)
- [x] T236 Visibly disable live-only POS affordances while offline (card authorization, other-location availability, on-account charging, and other live-only actions) before the cashier attempts them per FR-045, US4/AC3 (partial)
- [x] T237 Bring Lighthouse/CWV evidence to plan floors (p75 LCP ≤2.5 s and related LHCI assertions; current recorded LCP ~3296 ms) per plan:performance goals, SC-014 (partial)
- [x] T238 Complete and record Firefox and WebKit ten-story suite evidence (currently Chromium-only) per plan:Target Platform, SC-007 (partial)
- [x] T239 Complete and record NVDA and VoiceOver checks for critical journeys (currently axe/keyboard Chromium-only) per Constitution III, SC-008, UX-003 (partial)
- [x] T240 Complete and record physical Android/iOS camera grant/deny, hardware-scanner Enter suffix, receipt print, PWA install/update, and outage-recovery device checks per plan:Target Platform (partial)
- [x] T241 Stop client-side invention of permission atoms from role when the JWT omits `permissions`; rely on backend-provided permission claims (or document an approved exception) per FR-079 (contradicts)
- [x] T242 Refresh `validation/release-readiness.md` to an actual release approval only after constitution/plan merge gates and remaining convergence tasks pass per plan:CI and Release Gates, Constitution V (partial)
