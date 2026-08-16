# Feature Specification: Inventory and POS Frontend

**Feature Branch**: `001-inventory-pos-frontend`

**Created**: 2026-08-09

**Status**: Ready for implementation

**Input**: User description: "Build the responsive frontend web application for the
implemented InventoryX backend, covering business onboarding, catalogue and stock,
point of sale, offline selling, billing, register shifts, purchasing, reporting,
notifications, and the backend-supported advanced inventory capabilities."

## Scope

This feature delivers the Cycle 1 browser experience for business owners,
administrators, managers, accountants, stock clerks, and cashiers. The InventoryX
backend and its Cycle 1 contract documents are the source of truth for available
behavior, permissions, calculations, state transitions, plan limits, and errors.

The frontend scope includes account and staff administration; onboarding; simple,
variant, and batch-tracked products; spreadsheet product and opening-stock import;
multi-location stock; sales, supported payments, receipts, returns, exchanges, holds,
register shifts, offline sale synchronization, subscription billing, purchasing,
dashboard and standard reports, exports, schedules, alerts, and notifications.

The following requested capabilities are deferred because they have no Cycle 1 backend
contract: shared external barcode-catalogue enrichment; store credit, gift card,
loyalty-points, and on-account tenders; store-credit refunds; customer accounts, price
tiers, promotions, quotes, sales orders, backorders, receivables, and credit control;
supplier returns; serial tracking; bundles and kits; manufacturing and recipes;
tracked assets; returnable deposits; non-stock items; consignment; integrated scales;
custom report layouts; demand forecasting; native mobile applications; and
accounting or commerce integrations. Cycle 1 card and mobile-money tenders record a
payment completed through an external channel; integrated POS payment authorization
is outside this feature.

## Clarifications

### Session 2026-08-09

- Q: What must happen to unsynchronized offline sales across page reloads,
  browser/device restarts, and sign-out? -> A: Survive reloads and restarts; lock on
  sign-out and restore only after authorized access to the same register.
- Q: What receipt should a customer receive when a sale completes offline but has not
  synchronized? -> A: Provide a printable or QR provisional receipt marked "Pending
  sync"; offer the final receipt after synchronization.
- Q: When may a register use its cached snapshot for offline selling? -> A: Require a
  successful sync and online shift opening at the start of each shift; keep the
  snapshot valid for that open shift.
- Q: How should a sale rejected during synchronization be handled? -> A: Lock it for
  manager review; retain the original and allow retry after resolving the cause or
  record a linked reconciliation.
- Q: How long may a previously authorized cashier continue selling offline before
  online reauthorization is required? -> A: Until the current shift closes, with a
  hard maximum of 12 hours from last online authorization.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Onboard and Complete the First Sale (Priority: P1)

A new owner creates a business account, confirms the business profile, creates the
first location, adds products manually or through a previewed spreadsheet import,
records opening stock, creates a register, opens a shift, and completes the first sale.
A resumable checklist tracks progress, and sample data can be added and removed without
affecting real records.

**Why this priority**: This is the smallest journey that proves the product delivers
usable inventory and selling value.

**Independent Test**: Starting from a signed-out browser, create a fresh business,
add a product with 10 units, sell 2 units, and verify that stock shows 8 and the sale
appears in history.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they submit valid email, password, business name,
   country, currency, and business type, **Then** the business and owner are created,
   the 14-day Professional trial is shown, and onboarding begins.
2. **Given** a spreadsheet with valid and invalid rows, **When** the owner matches
   columns, **Then** every parsed row and error is previewed and no product is saved
   until the owner confirms the import.
3. **Given** a product with opening quantity 10, **When** a completed sale contains
   quantity 2, **Then** the interface shows quantity 8 after the confirmed sale.
4. **Given** a partially completed checklist, **When** the owner signs in again,
   **Then** completed and remaining steps are preserved.
5. **Given** sample and real records coexist, **When** the owner removes sample data,
   **Then** sample records disappear and real records remain unchanged.

---

### User Story 2 - Run a Fast Counter Sale and Return (Priority: P2)

A cashier adds items through a hardware barcode scanner, the device camera, typo-
tolerant search, or a configurable favourites grid. They adjust quantities, apply
permitted discounts, hold and recall sales, accept supported single or split payments,
deliver a receipt, and process a return or exchange against the original sale.

**Why this priority**: Checkout is the highest-frequency operational workflow and must
be fast, predictable, and resistant to cashier error.

**Independent Test**: Open a shift, add three products using scan, search, and
favourites, split payment between cash and card, deliver a receipt, return one line,
and confirm the refund and stock outcomes.

**Acceptance Scenarios**:

1. **Given** an open shift, **When** a known barcode is scanned, **Then** its matching
   tenant product is added without submitting a separate search form.
2. **Given** a misspelled product name, **When** the cashier searches, **Then** relevant
   products are returned and can be added without leaving the sale.
3. **Given** a total paid with multiple supported tenders, **When** the amounts equal
   the total, **Then** one completed sale records every tender and any cash change.
4. **Given** a cashier exceeds the permitted discount or refund threshold, **When**
   they attempt to continue, **Then** completion pauses for manager authorization.
5. **Given** an original sale, **When** a return or exchange is confirmed, **Then**
   original price and tax are used, stock disposition is recorded, and an exchange
   settles only the difference.
6. **Given** a held sale, **When** it is recalled, **Then** its lines and totals are
   restored and stock remains unaffected until completion.

---

### User Story 3 - Control Stock Across Locations (Priority: P3)

A manager or stock clerk views stock per location and business-wide, receives and
transfers goods, records reasoned adjustments and internal consumption, performs
counts, and reviews the permanent movement history. Approval rules protect material
adjustments and count variances.

**Why this priority**: Trustworthy location-level stock is required for selling,
reordering, valuation, and management decisions.

**Independent Test**: Dispatch 10 units between locations, receive 8 with a discrepancy
reason, submit a spot count, approve the variance, and inspect every resulting movement.

**Acceptance Scenarios**:

1. **Given** a dispatched transfer, **When** it has not been received, **Then** the
   quantity is visibly in transit and unavailable at both locations.
2. **Given** a partial or discrepant receipt, **When** destination staff record actual
   quantities, **Then** the discrepancy and reason remain visible.
3. **Given** an adjustment above the configured threshold, **When** it is submitted,
   **Then** stock does not change until a different authorized user approves it.
4. **Given** an erroneous movement, **When** a manager corrects it, **Then** the
   original remains visible and a new linked correction records the change.
5. **Given** a full, cycle, or spot count, **When** it is submitted, **Then** quantity
   and value variances are shown before approval changes stock.

---

### User Story 4 - Keep Selling During Connectivity Loss (Priority: P4)

A cashier starts each shift online, successfully synchronizes the register, and then
continues selling during an outage using the products, variants, prices, tax
treatments, favourites, and location stock captured for that open shift. Pending sales
are visible and synchronize automatically when connectivity returns.

**Why this priority**: Retailers cannot stop serving customers whenever connectivity
is unstable.

**Independent Test**: Synchronize a register, disconnect it, complete several allowed
sales, reconnect, and verify each sale is uploaded once with visible `applied`,
`applied_with_conflict`, or `rejected` status.

**Acceptance Scenarios**:

1. **Given** a prepared register loses connectivity, **When** the cashier completes an
   eligible sale, **Then** it is queued locally with an unobtrusive offline indicator
   and pending count.
2. **Given** connectivity returns, **When** synchronization runs, **Then** each queued
   sale is submitted once and its result is shown.
3. **Given** an action requires live data, **When** the register is offline, **Then**
   the action is visibly unavailable before the cashier attempts it.
4. **Given** concurrent selling creates contested or negative stock, **When** queued
   sales synchronize, **Then** the sale remains traceable and a conflict is raised for
   authorized review rather than silently overwriting stock.
5. **Given** a previously submitted offline sale is retried, **When** the same sale
   identity is sent again, **Then** no duplicate sale or stock movement is created.
6. **Given** pending sales exist, **When** the page reloads or the browser or device
   restarts, **Then** the queue is recovered; after sign-out it remains locked until
   authorized access to the same register is restored.
7. **Given** an offline sale completes, **When** the customer requests evidence of
   purchase, **Then** a printable or QR receipt marked "Pending sync" is available and
   is replaced by an authoritative final receipt only after successful synchronization.
8. **Given** a cashier attempts to start a shift without a successful current sync,
   **When** the register cannot reach the service, **Then** shift opening and offline
   selling are blocked; a previously prepared open shift remains usable through an
   outage.
9. **Given** synchronization rejects a queued sale, **When** its result is received,
   **Then** the original becomes immutable and locked for manager review; it may be
   retried only after the cause is resolved or closed through a linked reconciliation.
10. **Given** a cashier is selling offline, **When** the shift closes or 12 hours pass
    since the last online authorization, whichever occurs first, **Then** new offline
    sales are blocked until online reauthorization succeeds.

---

### User Story 5 - Manage Subscription and Business Data (Priority: P5)

An owner compares plans, sees trial and usage status, upgrades, schedules a downgrade,
cancels or reactivates, maintains billing details and payment method, downloads
invoices, and exports business data.

**Why this priority**: Owners need transparent control of service access, cost, and
their data without support intervention.

**Independent Test**: Exercise trial display, an immediate upgrade, a downgrade warning,
invoice download, cancellation, reactivation, and full data export as an owner.

**Acceptance Scenarios**:

1. **Given** a trial ends without subscription, **When** the owner next signs in,
   **Then** the Free plan and retained but read-only over-limit features are explained.
2. **Given** a downgrade would exceed lower-plan limits, **When** it is requested,
   **Then** every exceeded limit is listed and explicit acknowledgement is required.
3. **Given** payment retries exhaust the seven-day grace period, **When** the business
   becomes read-only, **Then** viewing, billing, and data export remain available while
   mutations clearly explain how to restore access.
4. **Given** a cancellation within the 90-day retention period, **When** the owner
   reactivates, **Then** retained business data becomes available under the restored
   subscription.
5. **Given** an export job is running, **When** the owner returns later, **Then** its
   current status and download availability are visible.

---

### User Story 6 - Reconcile a Register Shift (Priority: P6)

A cashier opens a register with a counted float, records reasoned cash movements, and
closes with a counted drawer. The interface shows expected cash, variance, and a shift
report, escalating material variances to a manager.

**Why this priority**: Cash accountability is essential for daily control at every
register.

**Independent Test**: Open a shift, complete cash sales and a reasoned cash-out, enter
the closing count, and verify expected cash, variance, tender totals, and the shift
report.

**Acceptance Scenarios**:

1. **Given** a register already has an open shift, **When** another user attempts to
   open one, **Then** the conflict is explained and no second shift is created.
2. **Given** an open shift, **When** cash enters or leaves outside a sale, **Then** the
   amount, direction, reason, time, and staff member are recorded.
3. **Given** a cashier attempts to close without a counted drawer, **When** they submit,
   **Then** closure is blocked and the missing count is identified.
4. **Given** the counted drawer differs beyond the threshold, **When** the shift closes,
   **Then** the variance is recorded and flagged to a manager.
5. **Given** a closed shift, **When** an authorized user views its report, **Then**
   sales, tenders, refunds, discounts, voids, and cash variance are summarized.

---

### User Story 7 - Replenish and Receive Stock (Priority: P7)

A purchasing user maintains suppliers and their products, reviews reorder alerts and
suggestions, creates purchase orders, follows approvals and delivery states, records
actual receipts, closes short deliveries with reasons, matches supplier invoices, and
allocates landed costs.

**Why this priority**: Replenishment converts stock visibility into action and prevents
lost sales from avoidable stockouts.

**Independent Test**: Create a supplier and draft order from a reorder suggestion,
approve and send it, receive part with damage, close the balance short, match an invoice,
and allocate landed costs.

**Acceptance Scenarios**:

1. **Given** products at or below reorder points, **When** suggestions are reviewed,
   **Then** they are grouped by supplier with explainable suggested quantities.
2. **Given** an order meets the approval threshold, **When** it is submitted, **Then**
   it awaits authorized approval before sending.
3. **Given** a delivery differs from the order, **When** actual and damaged quantities
   are recorded, **Then** the order remains partially received or closes short only
   with a reason.
4. **Given** a supplier invoice price differs from the order, **When** it is recorded,
   **Then** each difference is highlighted for review.
5. **Given** shipment costs are allocated, **When** allocation is confirmed, **Then**
   users see the resulting true item costs and stock values.

---

### User Story 8 - Monitor Performance and Alerts (Priority: P8)

An authorized manager signs in to a linked dashboard, filters standard sales, profit,
stock, purchasing, staff, and tax reports, exports results, schedules delivery, and
manages alert and notification preferences.

**Why this priority**: Managers need timely, traceable information to act on sales,
cash, tax, purchasing, and stock conditions.

**Independent Test**: Open the dashboard, follow each metric to detail, filter every
report family, start exports, schedule one report, and update notification preferences.

**Acceptance Scenarios**:

1. **Given** dashboard data, **When** a metric is selected, **Then** the relevant
   filtered detail opens.
2. **Given** a user without profit permission, **When** reports or products are viewed,
   **Then** cost, margin, and profit values are not exposed.
3. **Given** a long report range, **When** export is requested, **Then** the user can
   leave and later see progress and download availability.
4. **Given** repeated alerts of one type, **When** notifications are viewed, **Then**
   repetitions are consolidated with an occurrence count.
5. **Given** a report schedule, **When** its cadence, recipients, and format are saved,
   **Then** the schedule is visible and can later be deactivated.

---

### User Story 9 - Administer Staff and Sensitive Access (Priority: P9)

An owner or administrator invites staff, assigns a fixed role and location scope,
deactivates access, sets register PINs, enables two-factor authentication, and reviews
sensitive actions.

**Why this priority**: Multi-user operation requires least-privilege access and
accountability across locations.

**Independent Test**: Invite one user for one location, accept the invitation, set a
register PIN, verify permitted and forbidden views, and confirm sensitive actions in
the audit history.

**Acceptance Scenarios**:

1. **Given** an invitation would exceed the plan's user limit, **When** it is submitted,
   **Then** no invitation is created and the upgrade path is shown.
2. **Given** a user has an open shift, **When** an administrator attempts deactivation,
   **Then** it is blocked with the open-shift reason.
3. **Given** a location-scoped cashier signs in, **When** navigation loads, **Then**
   only permitted locations, actions, and data are accessible.
4. **Given** a sensitive action occurs, **When** an authorized administrator reviews
   the audit history, **Then** actor, time, action, target, and relevant reason are shown.
5. **Given** the sole owner account, **When** an administrator attempts to transfer or
   remove ownership through ordinary staff controls, **Then** the action is blocked.

---

### User Story 10 - Track Batches and Expiry (Priority: P10)

A stock user creates and receives batch-tracked products with manufacture and expiry
details, sees oldest-expiry-first issue order, receives expiry alerts, and traces a
batch backward to supply and forward to affected sales.

**Why this priority**: Batch traceability protects customers and reduces avoidable
expiry loss for food, health, and other dated goods.

**Independent Test**: Receive two batches with different expiries, sell stock, verify
the older-expiring batch is used first, then trace it to its receipt and sales.

**Acceptance Scenarios**:

1. **Given** multiple saleable batches, **When** a sale does not choose a batch,
   **Then** the oldest-expiring eligible stock is proposed and recorded.
2. **Given** a batch approaches the configured horizon, **When** alerts refresh,
   **Then** the affected product, location, quantity, batch, and expiry are identifiable.
3. **Given** a recalled batch, **When** trace is opened, **Then** its supplier receipt
   and every associated sale are shown.
4. **Given** damaged batch stock is received, **When** receipt is confirmed, **Then**
   damaged quantity is distinguished from saleable quantity.

### Edge Cases

- A session expires while a form or sale is in progress; recoverable work remains
  visible while reauthentication is requested.
- A user edits data that changed elsewhere; stale work is not silently saved and the
  user can refresh against the current record.
- A plan limit or read-only subscription blocks a mutation after the form was opened;
  entered data is preserved while the reason and upgrade action are shown.
- A scanner repeatedly sends the same barcode or includes an Enter suffix; one scan
  produces one intended cart action.
- Camera permission is denied or no camera exists; search and hardware scanning remain
  usable.
- An imported file has unknown columns, duplicate SKUs, duplicate barcodes, invalid
  decimals, mixed currencies, or partially valid rows.
- A fractional quantity exceeds three decimal places or is used for an item that does
  not permit fractional sale.
- A split payment is under, over, duplicated, or interrupted before completion.
- A held sale references a product whose price, tax, availability, or active status
  changed before recall.
- A receipt delivery destination is absent or delivery fails after the sale completed.
- An offline provisional receipt was issued but synchronization is later `rejected` or
  `applied_with_conflict`; it remains visibly provisional and links to the resolution
  state.
- A return quantity exceeds the quantity sold or previously returned.
- A transfer destination records more, less, or damaged stock compared with dispatch.
- The requester attempts to approve their own adjustment or count variance.
- An offline device has no initial snapshot, an expired register session, insufficient
  local stock, or a queue that contains `rejected` and `applied_with_conflict` sales
  together.
- A rejected sale cannot be resolved immediately; it remains retained, excluded from
  automatic retry, and visible to authorized managers until reconciled.
- A cashier signs out or loses authorization while offline sales remain pending; the
  queue remains retained but inaccessible until the same register is authorized again.
- A register closes in one session while another still displays it as open.
- A purchase order receives an illegal state transition or simultaneous edits.
- A long-running export expires before download or fails and must be retried.
- A user loses a permission or location assignment while a restricted page is open.
- A disconnected register reaches its 12-hour authorization limit; the active sale is
  preserved, but no new sale may complete until online reauthorization succeeds.
- Currency, quantity, tax, and time values cross locale or daylight-saving boundaries;
  business events retain their authoritative values.

### Experience Requirements _(mandatory for user-facing features)_

- **UX-001**: Every data view and workflow MUST define loading, empty, success,
  validation, permission-denied, stale-data, and recoverable failure states.
- **UX-002**: Core onboarding, POS, stock count, receiving, and manager approval
  journeys MUST remain usable at 320 CSS pixels and representative tablet and desktop
  widths without horizontal page scrolling.
- **UX-003**: All interactive behavior MUST be keyboard operable with accessible names,
  visible focus, logical focus order, and WCAG 2.2 Level AA contrast.
- **UX-004**: Content MUST remain usable at 200% browser zoom.
- **UX-005**: Frequent POS actions MUST keep the current sale in context and MUST NOT
  require navigating away to scan, search, change quantity, hold, or take payment.
- **UX-006**: Destructive, irreversible, financial, and stock-changing actions MUST
  summarize their consequences and require explicit confirmation where reversal is
  not immediate.
- **UX-007**: Offline and pending-sync status MUST remain visible without obscuring
  selling controls; blocked live-only actions MUST explain why they are unavailable.
- **UX-008**: Role, location, subscription, and plan restrictions MUST be communicated
  before users invest effort where practical, while backend denial remains the final
  authority.

## Requirements _(mandatory)_

### Functional Requirements

#### Account, Onboarding, and Staff

- **FR-001**: The system MUST let a visitor create a business and owner account using
  email, password, business name, country, currency, and business type.
- **FR-002**: The system MUST support email/password sign-in, session renewal, Google
  sign-in, two-factor enrollment and challenge, and register-PIN access as allowed by
  the backend.
- **FR-003**: The system MUST display tenant profile, trial or subscription status,
  usage limits, and a resumable onboarding checklist.
- **FR-004**: Owners and administrators MUST be able to update business profile,
  valuation method (with explicit confirmation), and configured approval thresholds
  when permitted, through business settings.
- **FR-005**: Owners and administrators MUST be able to load and remove sample data
  with clear separation from real business records.
- **FR-006**: The system MUST support location creation and selection before stock,
  register, or sale workflows that require a location.
- **FR-007**: Product setup MUST support simple, variant, and batch-tracked products
  with tenant-unique SKU, optional barcode, price, cost, tax treatment, category, unit,
  and reorder settings. Variant setup MUST capture its attribute schema and each
  variant's values, SKU, and barcode.
- **FR-008**: Product and opening-stock import MUST support CSV and spreadsheet upload,
  detected columns, explicit column matching, full row preview, row-level warnings and
  errors, confirmation, resumable commit results, and abandonment.
- **FR-009**: The system MUST show per-location opening quantity and cost outcomes after
  import or adjustment.
- **FR-010**: Owners and administrators MUST be able to invite staff, assign one fixed
  role and permitted locations, deactivate eligible users, and set or replace register
  PINs without allowing removal of the sole Owner.
- **FR-011**: Authorized users MUST be able to review sensitive actions, including
  pricing, refunds, voids, stock changes, approvals, and access changes.

#### Point of Sale, Receipts, and Returns

- **FR-012**: The POS MUST add tenant products by hardware scan, device-camera scan,
  typo-tolerant search, or a register's configurable favourites grid.
- **FR-013**: Unknown barcodes MUST offer a clear no-match result and an authorized path
  to create a product manually; the system MUST NOT claim shared-catalogue enrichment.
- **FR-014**: The POS MUST support quantity changes, allowed fractional quantities,
  notes, permitted price overrides, and line discounts while showing live subtotal,
  tax components, total, tendered amount, and change.
- **FR-015**: Cashiers MUST be able to create, list, recall, and complete multiple held
  sales without changing stock before completion.
- **FR-016**: Completed sales MUST support Cash, Card, MobileMoney, BankTransfer, and
  Cheque tenders, including splits whose payment amounts satisfy the authoritative
  total.
- **FR-017**: The system MUST preserve the backend-calculated price, tax, discount,
  total, change, stock, and sale identity rather than recomputing a conflicting result.
- **FR-018**: A completed sale MUST update sale history and affected stock views after
  confirmation, with refresh behavior that avoids duplicate submission.
- **FR-019**: Authoritative receipts MUST be printable from their structured content
  and deliverable through supported email, SMS, or QR channels, with delivery success
  or failure shown separately from sale completion. An offline sale MUST offer a
  printable or QR provisional receipt visibly marked "Pending sync"; it MUST NOT be
  represented as final, and the final receipt becomes available only after successful
  synchronization.
- **FR-020**: Owners and administrators MUST be able to maintain receipt logo, business
  and tax details, footer, and return policy.
- **FR-021**: Users MUST be able to locate a sale by receipt number or sale search and
  select eligible lines and quantities for return.
- **FR-022**: Returns MUST use original price and tax, record ToStock or Quarantine
  disposition, and support Original or Cash refund tender in Cycle 1.
- **FR-023**: Receiptless or above-threshold returns and discounts MUST pause for
  manager authorization when the backend requires approval.
- **FR-024**: Exchanges MUST combine a return and replacement sale and present only the
  net amount due or refundable.
- **FR-025**: Authorized users MUST be able to void an eligible sale with reason and see
  the resulting audit and stock outcome.
- **FR-026**: Other-location availability MUST be treated as live data and MUST be
  unavailable while offline.

#### Inventory, Transfers, Counts, and Batches

- **FR-027**: Stock views MUST support location, product, category, reorder, and expiry
  filters plus a business-wide product rollup.
- **FR-028**: Cost, margin, profit, and valuation information MUST be absent from stock,
  movement, and valuation views for users without the required permission. This is the
  stock-view application of FR-078.
- **FR-029**: The movement history MUST support product, location, type, date, and user
  filters and MUST present corrections as new linked entries without hiding originals.
- **FR-030**: Reasoned adjustments MUST support multiple lines, notes, known adjustment
  reasons, and visible pending, approved, or rejected state.
- **FR-031**: Above-threshold adjustments MUST not appear as effective stock until an
  eligible user other than the requester approves them.
- **FR-032**: Authorized stock users MUST be able to record internal consumption.
- **FR-033**: Transfers MUST support draft, dispatch, in-transit visibility, destination
  receipt, per-line actual quantities, and a required discrepancy reason.
- **FR-034**: Full, cycle, and spot counts MUST support scoped opening, incremental
  scan-driven entry, submission, quantity and value variance review, approval, and
  rejection.
- **FR-035**: Approved count corrections MUST be visible as permanent stock movements.
- **FR-036**: Batch views MUST show remaining quantity, manufacture or expiry details
  when available, and oldest-expiry-first order.
- **FR-037**: Batch trace MUST connect a batch to its supplier receipt and affected
  sales for recall investigation.
- **FR-038**: Alerts MUST cover low stock, out of stock, expiry, overstock, and
  slow-moving stock. For each alert type, the interface MUST show and edit the
  tenant threshold only when the InventoryX contract exposes that threshold; otherwise
  it MUST show the provider-defined rule and MUST NOT imply that the threshold is
  configurable.
- **FR-039**: Reorder views MUST group eligible products by supplier, explain suggested
  quantities based on sales rate and lead time, and allow selected suggestions to
  become draft purchase orders.

#### Offline Selling and Conflict Review

- **FR-040**: A register MUST successfully obtain a full or incremental local snapshot
  of permitted products, variants, prices, tax treatments, favourites, and location
  stock before each shift opens. Shift opening MUST be online; after it opens, that
  snapshot remains valid for offline selling until the shift closes.
- **FR-041**: Connectivity status and pending-sale count MUST update without interrupting
  an active sale.
- **FR-042**: Eligible offline sales MUST retain a unique client identity, business
  occurrence time, register, shift, lines, tenders, and status until confirmed. The
  queue MUST survive page reload and browser or device restart; sign-out MUST lock it,
  and only renewed authorization to the same register may restore access.
- **FR-043**: Queued offline sales MUST submit automatically after connectivity returns
  and MUST expose `applied`, `applied_with_conflict`, or `rejected` result per sale. A
  rejected sale MUST become immutable, stop automatic retry, remain retained for
  manager review, and permit retry only after its cause is resolved or closure through
  a linked reconciliation; it MUST NOT be silently deleted.
- **FR-044**: Retrying a sale with the same identity MUST reuse its prior result and
  MUST NOT create a duplicate sale or stock movement.
- **FR-045**: Online card authorization, other-location availability, on-account
  charging, billing, administration, and other live-only actions MUST be visibly
  unavailable offline.
- **FR-046**: Authorized users MUST be able to review open stock conflicts and resolve
  each by accepting the recorded result or posting a reasoned adjustment.

#### Subscription, Billing, and Data Control

- **FR-047**: Visitors MUST be able to compare the current backend-provided plan matrix,
  prices, limits, and feature flags without signing in.
- **FR-048**: Owners MUST see current plan, status, period, trial and grace deadlines,
  and usage against limits.
- **FR-049**: Upgrades MUST communicate immediate and pro-rata effect before
  confirmation.
- **FR-050**: Downgrades MUST identify every currently exceeded lower-plan limit,
  schedule the change for period end, and require explicit acknowledgement.
- **FR-051**: Cancellation MUST explain period-end effect, 90-day retention,
  reactivation, export, and final deletion timing before confirmation.
- **FR-052**: Failed-payment grace and read-only states MUST explain remaining time,
  retry status, available owner actions, and why mutations are blocked.
- **FR-053**: Owners MUST be able to initialize a supported card or Ghana mobile-money
  billing method without exposing stored payment credentials.
- **FR-054**: Owners MUST be able to maintain billing contact and tax number, browse
  invoice history, and download invoice documents.
- **FR-055**: Owners and administrators MUST be able to start a full data export and
  later view progress and download availability, including while read-only.

#### Registers and Cash

- **FR-056**: Authorized users MUST be able to list and manage registers within their
  location and plan limits.
- **FR-057**: A cashier MUST record a counted opening float and MUST not open a second
  active shift on the same register.
- **FR-058**: Cash movements MUST record amount, CashIn or CashOut direction, reason,
  optional note, time, and staff member.
- **FR-059**: Shift closure MUST require the counted drawer and show expected cash,
  counted cash, and variance before final confirmation.
- **FR-060**: Closed shifts MUST expose a report covering sales, tender breakdown,
  refunds, discounts, voids, register, staff member, and cash variance.

#### Purchasing and Receiving

- **FR-061**: Purchasing users MUST be able to maintain every supplier field exposed
  by InventoryX, including identity, contacts, terms, lead time, currency, supplied
  products, supplier codes, prices, performance, and order history. Fields absent from
  the provider contract MUST be omitted or shown read-only with a clear unavailable
  state; the frontend MUST NOT invent supplier data.
- **FR-062**: Purchase orders MUST support manual, reorder-suggestion, and alert origins
  and show Draft, AwaitingApproval, Sent, PartiallyReceived, FullyReceived, Closed, and
  Cancelled states.
- **FR-063**: Draft orders MUST be editable; illegal state transitions MUST be blocked
  without discarding the user's current context.
- **FR-064**: Orders meeting the configured value gate MUST wait for approval before
  sending, and rejection or cancellation MUST retain its reason.
- **FR-065**: Authorized users MUST be able to send an order to a supplier or obtain
  its document.
- **FR-066**: Goods receipt MUST capture actual, damaged, and outstanding quantities,
  unit costs, and required batch and expiry details for batch-tracked lines.
- **FR-067**: Partial receipt MUST leave the balance open; closing short MUST require a
  reason.
- **FR-068**: Supplier invoice matching MUST identify ordered-versus-invoiced price
  differences by line.
- **FR-069**: Landed costs for freight, duty, clearing, and insurance MUST be allocatable
  across receipt lines and resulting item cost changes MUST be visible.

#### Dashboard, Reports, and Notifications

- **FR-070**: The dashboard MUST show today versus the same weekday last week for sales,
  transaction count, average basket, cash in drawer, items sold, warning counts, and
  top sellers, with each metric linked to relevant detail.
- **FR-071**: Standard reports MUST cover sales, profit, stock, purchasing, staff, and
  Ghana tax, subject to role permissions.
- **FR-072**: Reports MUST filter by supported date, location, category, and staff
  dimensions and retain applied filters when navigating to detail.
- **FR-073**: Reports MUST export as CSV, XLSX, or PDF; long exports MUST expose
  queued, processing, completed, or failed status.
- **FR-074**: Authorized users MUST be able to schedule supported reports daily,
  weekly, or monthly with format and recipients, list schedules, inspect one, and
  deactivate it.
- **FR-075**: Notifications MUST provide a paged feed, unread state, consolidated
  occurrence count, mark-one-read, and mark-all-read.
- **FR-076**: Users MUST be able to manage InApp, Email, Push, and Sms channels plus
  supported thresholds for their own notification preferences. Cycle 1 persists the
  Push preference flag only; InventoryX owns push delivery.
- **FR-077**: The interface MUST surface low/out-of-stock, expiry, purchasing, transfer,
  discount, refund, till, void, negative-stock, billing, and digest notifications when
  returned for the user.
- **FR-078**: Dashboard, report, and product profit fields MUST honor the backend's
  ViewProfit decision without inferring hidden values. This is the canonical
  profit-field rule; FR-028 applies the same rule to stock, movement, and valuation
  views.

#### Contract and State Integrity

- **FR-079**: The frontend MUST treat backend-provided permissions, tenant and location
  scope, plan flags, calculations, state transitions, and validation as authoritative.
- **FR-080**: Lists backed by paged results MUST expose total count and usable paging,
  never requesting more than the supported maximum page size.
- **FR-081**: Field validation failures MUST appear beside relevant inputs, while
  business-rule failures MUST identify the blocked action and a recovery path.
- **FR-082**: Plan-limit or read-only failures MUST preserve entered work and show the
  limit, current usage, and upgrade guidance supplied by the backend.
- **FR-083**: Stale-update or invalid-transition conflicts MUST prevent silent overwrite
  and offer a refresh path before resubmission.
- **FR-084**: Approval-required responses MUST retain the pending action and direct it
  to an eligible authorizer.
- **FR-085**: Monetary and quantity input MUST preserve decimal precision; displayed
  currency, tax components, and localized times MUST not change authoritative values.
- **FR-086**: Session renewal or sign-out MUST prevent unauthorized data exposure and
  preserve only recoverable, non-sensitive local work.
- **FR-087**: The frontend MUST not expose backend records, actions, navigation, or
  cached offline data outside the signed-in tenant, assigned locations, role, and
  register scope.
- **FR-088**: Every critical mutation MUST protect against accidental duplicate
  submission and show one definitive outcome.
- **FR-089**: Offline selling authorization MUST end when the current shift closes or
  12 hours elapse from the last successful online authorization, whichever occurs
  first. Reaching the limit MUST preserve the active sale and pending queue but block
  completion of new sales until online reauthorization succeeds.
- **FR-090**: Authorized stock users MUST be able to list, create, rename, reparent,
  and deactivate product categories without creating cycles or assigning a category as
  its own descendant. Product forms, stock filters, and reports MUST use these
  category records.

### Key Entities

- **Session**: Authenticated user context, expiry, tenant, role, location scope,
  optional register scope, last online authorization, and offline authorization
  deadline.
- **Tenant**: Business profile, country, currency, approval thresholds, valuation
  choice, onboarding state, and sample-data state.
- **Subscription and Plan**: Trial or paid status, plan limits, feature flags, billing
  period, grace, cancellation, retention, and usage.
- **User, Role, and Invitation**: Staff identity, fixed role, permission atoms,
  assigned locations, active state, invitation, two-factor state, and register PIN.
- **Location and Register**: Shop, warehouse, vehicle, or stall and its selling device
  context, favourites, and active shift.
- **Product, Variant, Category, and Tax Treatment**: Catalogue identity, pricing,
  tracking mode, barcode, unit, reorder settings, variant attributes, tax rules, and
  category tree with parent/child constraints.
- **Import Job**: Uploaded file, detected columns, mapping, row previews, errors,
  progress, and commit outcome.
- **Stock Level and Movement**: Quantity and value by product and location, plus the
  append-only event that explains each change or correction.
- **Transfer and Stock Count**: Scoped stock workflow, lines, state, discrepancies,
  variances, actors, reasons, and approvals.
- **Batch**: Lot identity, manufacture and expiry dates, remaining quantity, receipt
  source, issue order, and downstream sales trace.
- **Sale, Sale Line, and Payment**: Client identity, location, register, shift, items,
  authoritative tax and totals, supported tenders, status, and occurrence time.
- **Held Sale and Offline Sale**: Incomplete or durably queued sale with local status,
  register ownership, access-lock state, rejection and reconciliation state, and
  eventual authoritative outcome.
- **Receipt, Return, and Exchange**: Provisional or final sale evidence, sync status,
  delivery history, returned lines, disposition, authorization, refund tender, and net
  settlement.
- **Shift and Cash Movement**: Opening float, external cash activity, expected and
  counted closing cash, variance, and shift report.
- **Supplier and Supplier Product**: Contact and terms, lead time, supplied catalogue,
  pricing history, and performance.
- **Purchase Order, Goods Receipt, Supplier Invoice, and Landed Cost**: Replenishment
  state, approvals, ordered and actual quantities, discrepancies, invoice differences,
  and true received cost.
- **Dashboard Metric, Report, Export Job, and Schedule**: Filtered management insight,
  detail destination, asynchronous output, cadence, format, and recipients.
- **Alert, Notification, and Preference**: Actionable event, occurrence count, read
  state, channel selection, and threshold.
- **Audit Entry and Stock Conflict**: Permanent accountability for sensitive actions
  and authorized resolution of contested offline stock.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of representative new owners complete sign-up through first
  recorded sale without assistance in 15 minutes or less.
- **SC-002**: At least 95% of known barcode scans add the intended product to an active
  sale within 1 second when data is already available on the device. The automated
  merge gate is the plan's cached barcode-to-cart p95 budget of 200 ms; 1 second is
  the user-facing success bar.
- **SC-003**: At least 90% of trained cashiers complete a three-item, split-tender sale
  in 2 minutes or less without leaving the POS workspace.
- **SC-004**: A completed online sale appears in sale history and updated stock within
  2 seconds for at least 95% of normal user sessions.
- **SC-005**: A prepared register can complete and retain at least 100 consecutive
  eligible offline sales through page reload and browser or device restart. After
  sign-out the queue is inaccessible until the same register is authorized, and every
  queued sale receives exactly one visible `applied`, `applied_with_conflict`, or
  `rejected` outcome after reconnection.
- **SC-006**: 100% of tested plan-limit, permission, approval, stale-update, and
  read-only failures preserve user context and display an actionable explanation.
- **SC-007**: All critical journeys complete without horizontal page scrolling at
  320-pixel mobile, 768-pixel tablet, and 1440-pixel desktop test widths.
- **SC-008**: All critical journeys are completable using only a keyboard, remain usable
  at 200% zoom, and have no critical or serious automated accessibility violations.
- **SC-009**: At least 90% of representative cashiers and managers complete their
  assigned primary task on the first attempt during usability validation. Cycle 1
  evidence is recorded in `usability-us1.md`, `usability-us2.md`, and
  `usability-us6.md`.
- **SC-010**: Report filters visibly update results within 3 seconds for at least 95%
  of normal ranges, while longer work acknowledges queuing within 2 seconds.
- **SC-011**: No tested user can view or act on another tenant's data, an unassigned
  location, a forbidden financial field, or a role-restricted action.
- **SC-012**: 100% of repeated submissions for the same completed or synchronized sale
  produce one sale and one set of stock effects.
- **SC-013**: In 100% of acceptance tests, users are offered only actions the service
  can complete; deferred actions are absent or clearly labelled unavailable and are
  never simulated as successful.
- **SC-014**: Primary authenticated pages become usable within 3 seconds for at least
  95% of sessions on a representative mid-range mobile device and standard connection.
- **SC-015**: Every completed offline sale can produce a printable or QR provisional
  receipt marked "Pending sync"; none is presented as final before synchronization,
  and every successfully applied sale makes its final receipt available.
- **SC-016**: In 100% of readiness tests, offline selling is enabled only after a
  successful sync and online shift opening, remains available through an outage for
  that open shift, and is disabled when the shift closes.
- **SC-017**: In 100% of rejected-sale tests, the original sale remains immutable and
  visible to authorized managers, automatic retry stops, and resolution produces
  either one accepted retry outcome or one linked reconciliation without deletion.
- **SC-018**: In 100% of offline-authorization tests, new offline sale completion is
  blocked at shift close or exactly 12 hours after the last online authorization,
  whichever occurs first, while the active sale and pending queue remain recoverable.

## Assumptions

- InventoryX Cycle 1 is implemented and its contract documents under
  InventoryX/specs/001-inventory-pos-platform/contracts are the authoritative
  dependency. The frontend does not redefine backend calculations or state machines.
- Ghana is the first launch market: English interface, GHS default currency, Ghana tax
  treatments, and MTN, Telecel, or AT mobile money for subscription billing.
- Cycle 1 uses the fixed roles Owner, Administrator, Manager, Accountant, StockClerk,
  and Cashier with backend-provided permission and location scope.
- Free and Standard monthly sale caps are 300 and 3,000 respectively; all other plan
  limits, prices, and feature flags are displayed from the current plan matrix rather
  than hard-coded.
- The web application may use a browser-accessible camera where supported. Hardware
  barcode scanners behave as keyboard input. Search remains the fallback.
- Offline POS requires a previously authenticated, register-scoped session, successful
  synchronization, and online opening of the current shift for one register location.
  The synchronized snapshot remains valid until that shift closes, while offline sale
  authorization lasts no more than 12 hours from the last online authorization. The
  browser is the Cycle 1 client; native mobile applications are not included.
- Receipt printing uses available browser or device printing. Email, SMS, and QR
  delivery reflect backend-confirmed delivery outcomes.
- Card, mobile-money, bank-transfer, and cheque POS tenders are records of settlement
  handled outside this frontend unless a later backend contract adds authorization.
- Backend-provided monetary totals, Ghana tax components, stock results, plan decisions,
  and timestamps remain authoritative. The frontend localizes display only.
- Full data purge after the retention period and scheduled delivery execution are
  backend responsibilities; the frontend communicates status, deadlines, warnings,
  and results.
- Backend availability, valid environment configuration, and test accounts for each
  role and subscription state are dependencies for integration and end-to-end testing.
- Deferred capabilities listed in Scope require new backend contracts and a separate
  specification amendment before frontend implementation.

## Dependencies

The following InventoryX Cycle 1 documents define the supported behavior for this
frontend and MUST remain the source for planning and acceptance tests:

- [Authentication, tenancy, users, and roles](../../../InventoryX/specs/001-inventory-pos-platform/contracts/auth-tenancy.md)
- [Subscription and billing](../../../InventoryX/specs/001-inventory-pos-platform/contracts/billing.md)
- [Catalogue, import, and export](../../../InventoryX/specs/001-inventory-pos-platform/contracts/catalog-import.md)
- [Locations, stock, transfers, counts, and alerts](../../../InventoryX/specs/001-inventory-pos-platform/contracts/inventory.md)
- [Suppliers and purchasing](../../../InventoryX/specs/001-inventory-pos-platform/contracts/purchasing.md)
- [Registers, sales, returns, receipts, and offline synchronization](../../../InventoryX/specs/001-inventory-pos-platform/contracts/pos-sales-sync.md)
- [Dashboard, reports, and notifications](../../../InventoryX/specs/001-inventory-pos-platform/contracts/reports-notifications.md)

If a generated service description and these reviewed contract documents disagree,
planning and implementation MUST stop for the affected capability until the backend
contract is reconciled; unaffected capabilities may continue. The frontend MUST NOT
guess at financial, stock, permission, or state-transition behavior.
