# Quickstart: Validate the Inventory and POS Frontend

This guide is the runnable validation path for the implementation described in
[plan.md](./plan.md). It references [data-model.md](./data-model.md) and the
[frontend contracts](./contracts/README.md) rather than duplicating their models.

## Prerequisites

- Node.js 24 LTS
- Corepack and pnpm 11.20.0
- A local or test InventoryX instance with its database migrated
- InventoryX CORS configured for the frontend origin
- HTTPS for camera/service-worker testing outside localhost
- Test identities for Owner, Manager, Accountant, StockClerk, and Cashier plus at least
  two locations and one register
- P4 provider readiness gate completed before claiming offline production validation

InventoryX's local run, migration, and provider-test instructions remain in the
InventoryX repository. Do not place backend secrets in this frontend repository.

## Configure

After the implementation establishes the planned files and scripts:

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set the non-secret service origin in `.env.local`:

```env
VITE_INVENTORYX_ORIGIN=http://localhost:5291
VITE_SENTRY_DSN=
```

The API adapter appends the versioned path from its generated contract. Production must
use HTTPS and an explicit allowed origin.

## Capture and Verify the Provider Contract

With InventoryX running:

```bash
curl --fail http://localhost:5291/swagger/v1/swagger.json \
  --output openapi/inventoryx-v1.json
pnpm api:generate
pnpm api:check
```

Expected:

- generated API files have no uncommitted diff;
- all consumed operations, RFC 7807 shapes, ETags, paging limits, and live-only metadata
  pass contract tests;
- the four InventoryX offline readiness items in [plan.md](./plan.md) are either proven
  by provider tests or P4 integration remains blocked.

## Run the Application

```bash
pnpm dev
```

Open the URL printed by Vite. Confirm public registration and plan routes load without
an authenticated API call, then sign in and confirm the navigation surface changes by
permission and location.

## Fast Quality Loop

```bash
pnpm format:check
pnpm lint --max-warnings=0
pnpm typecheck
pnpm test
pnpm build
```

Expected: zero warnings, no skipped/focused tests, strict typecheck success, and a
production build within the bundle budgets in the plan.

## Scenario A: Onboard Through First Sale

1. Register a new Ghana business using email, password, business name, GHS, country,
   and business type.
2. Confirm the 14-day Professional trial and onboarding checklist.
3. Create `Main Shop`, one register, and product `Sugar 1kg` with SKU `SUG-001`, selling
   price 10.00, cost 6.00, and the standard Ghana tax treatment.
4. Record opening stock of 10.
5. Open the register shift with a counted float.
6. Sell quantity 2 and pay cash.
7. Open sale history and stock detail.

Expected:

- server-confirmed totals and change are displayed;
- sale appears once in history;
- stock is 8;
- receipt is final and printable;
- checklist retains completed steps after reload.

Automated proof:

```bash
pnpm test:e2e --grep "onboard through first sale"
```

## Scenario B: Import with Preview

1. Upload a CSV/XLSX fixture containing valid rows, one duplicate SKU, one duplicate
   barcode warning, and one invalid decimal.
2. Match source columns to product fields.
3. Inspect every preview row before commit.
4. Commit valid rows, then run the opening-stock import flow.

Expected: nothing persists before confirmation; errors remain row-specific; commit
counts created/updated/skipped records; a recoverable failure preserves the mapping and
preview context.

```bash
pnpm test:e2e --grep "import preview"
```

## Scenario C: Counter Sale, Hold, Split Tender, and Return

1. On an open shift, add products using hardware-scanner input, typo-tolerant search,
   and favourites.
2. Change quantity, apply an allowed discount, hold the sale, serve another cart, and
   recall the held sale.
3. Split a completed payment between Cash and Card.
4. Print/deliver a final receipt.
5. Find the sale by receipt and return one line; then execute an exchange fixture.

Expected: cart context never leaves the POS workspace; one scan produces one add;
payments equal the authoritative total; excessive discount/refund requires approval;
return uses original price/tax; exchange settles only the difference.

```bash
pnpm test:e2e --grep "counter sale|held sale|return exchange"
```

## Scenario D: Offline Durability and Recovery

Run only against an InventoryX environment that passes the P4 readiness gate.

1. Sign in, select the same tenant/location/register, synchronize a full preparation
   bundle, and open the shift online.
2. Disconnect the browser through Playwright or browser developer tools.
3. Complete offline sales and print a provisional receipt marked `Pending sync`.
4. Reload, restart the browser context, and confirm the queue and stock overlays recover.
5. Sign out and verify queue count/details are locked; reauthorize the same register
   online and verify they unlock.
6. Reconnect and verify one leader uploads each immutable client sale ID once.
7. Exercise `applied`, `applied_with_conflict`, and `rejected` fixtures.
8. Advance the controlled clock to shift close and the 12-hour boundary.

Expected:

- queue and overlay write atomically;
- provisional receipt never appears final;
- another tenant/register cannot inspect the partition;
- transient failures retry the same identity;
- applied overlay retires only after snapshot merge;
- rejection stops retry and enters manager review;
- deadline preserves the cart/queue but blocks new completion.

```bash
pnpm test:e2e:offline
pnpm test:e2e:offline --grep "100 sale recovery"
```

## Scenario E: Stock, Counts, Transfers, and Purchasing

1. Dispatch 10 units from Location A to B and confirm in-transit availability.
2. Receive 8 with a discrepancy reason.
3. Run a spot count and approve the variance as a different authorized user.
4. Review the append-only movement and correction history.
5. Apply a reorder suggestion to a draft PO, exercise approval, send, partial receipt,
   batch/expiry entry, close-short reason, invoice price difference, and landed cost.

Expected: permission/approval gates match InventoryX; original movements remain;
purchase-order state changes are server-confirmed; FEFO and true cost are visible.

```bash
pnpm test:e2e --grep "stock control|purchase order"
```

## Scenario F: Plans, Permissions, Reports, and Notifications

1. Verify plan-limit 402, read-only subscription, downgrade acknowledgement, invoice,
   billing contact, cancellation/reactivation, and full export states.
2. Sign in with each fixed role and verify route/data/financial-field visibility.
3. Trigger an ETag conflict and approval-required response while forms contain edits.
4. Filter dashboard reports, follow detail links, start a long export, create/deactivate
   a schedule, and update notification preferences.

Expected: work is preserved; exact server recovery/upgrade hints are shown; no hidden
profit/location data is requested or rendered; stale writes never overwrite; export and
notification states are explicit.

```bash
pnpm test:e2e --grep "billing|permissions|reports"
pnpm test:contract
```

## Responsive and Accessibility Validation

```bash
pnpm test:a11y
pnpm test:e2e:responsive
```

Required automated evidence:

- 320x800, 768x1024, and 1440x900 changed critical journeys;
- no page-level horizontal overflow;
- keyboard-only completion and focus restoration;
- 200% zoom usability;
- zero critical/serious axe findings;
- chart table alternatives and print-only receipt layout.

Required manual release evidence:

- NVDA with Firefox or Chrome;
- VoiceOver with Safari and iOS;
- real Android/iOS camera permission granted and denied;
- hardware scanner with Enter suffix;
- receipt printing;
- service-worker update during an open shift.

## Performance Validation

```bash
pnpm test:performance
pnpm build:analyze
```

Expected: all Core Web Vital, transfer, route chunk, barcode, enqueue, recovery, sale,
report, Lighthouse, and accessibility budgets in [plan.md](./plan.md) pass. A score
alone does not waive a failed user-facing timing budget.

## Complete Gate

```bash
pnpm verify
pnpm test:e2e:full
```

The feature is ready only when all ten user journeys pass, the InventoryX OpenAPI diff
is clean, the P4 provider gate passes, no constitutional exception is open, and manual
camera/printing/screen-reader evidence is attached to the release record.
