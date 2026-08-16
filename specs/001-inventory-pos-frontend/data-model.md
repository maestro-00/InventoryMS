# Data Model: Inventory and POS Frontend

**Date**: 2026-08-09

**Plan**: [plan.md](./plan.md)

**Research**: [research.md](./research.md)

**Provider**: InventoryX `/api/v1` and its Cycle 1 contract documents

## Ownership and Type Conventions

InventoryX owns every business record, permission decision, total, tax calculation,
stock movement, approval, and workflow transition. The frontend keeps server responses
in the in-memory TanStack Query cache and MUST NOT reproduce them as a second local
system of record. IndexedDB contains only the bounded register data required by the
offline contract.

Generated OpenAPI types are the transport source of truth. The names below are stable
frontend concepts, not hand-written replacements for generated DTOs.

| Concept         | Type and rule                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Uuid`          | Lowercase canonical UUID string; generated client-side only where the contract requires an idempotency key                                                        |
| `DecimalString` | Base-10 string, never a JavaScript `number`; money is non-negative unless the contract identifies a signed variance, and quantity has at most 3 fractional digits |
| `CurrencyCode`  | ISO 4217 uppercase code supplied by the tenant or server                                                                                                          |
| `UtcInstant`    | ISO 8601 UTC timestamp with an explicit `Z` or offset                                                                                                             |
| `LocalDate`     | ISO `YYYY-MM-DD` calendar date without timezone conversion                                                                                                        |
| `ETag`          | Opaque response header retained beside mutable server projections and returned unchanged in `If-Match`                                                            |
| `Permission`    | Server-provided permission atom; absence means the record or action is unavailable                                                                                |
| `PartitionKey`  | `${tenantId}:${registerId}`; derived from authenticated claims, never from user input                                                                             |

All API responses are parsed at runtime with Zod at the feature boundary. Unknown enum
values render a recoverable unsupported-state view and are reported as contract drift;
they are never coerced into a known state. Cost, margin, profit, and valuation fields
are optional because InventoryX omits them when the caller lacks `ViewProfit`.

## Server-Owned View Models

These projections live in query memory only unless a later section explicitly lists a
field in the offline snapshot. Query keys always begin with tenant identity and include
location, register, permission-sensitive view, filters, and pagination where relevant.

### Identity, Tenant, and Billing

| View model         | Key fields and relationships                                                                                                            | Validation and derived presentation                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionView`      | `userId`, `tenantId`, `role`, `permissions[]`, `locationScope[]`, token expiry; optional `registerId` for a reduced register token      | Claims are parsed from the authenticated response/token but are authorization hints only. Effective route access is permission + location + plan/read-only state; the server remains authoritative. Normal access and refresh tokens are memory-only. |
| `TenantView`       | `tenantId`; business name, country, currency, business type, approval thresholds, valuation method, onboarding steps, sample-data state | Country and currency are required. A valuation-method mutation requires explicit confirmation. Onboarding progress is derived from server checklist steps, not inferred from local records.                                                           |
| `PlanView`         | plan identifier/tier; prices, billing cycles, limits, feature flags                                                                     | Public server matrix drives comparison and limit labels. No prices or limits are compiled into the client.                                                                                                                                            |
| `SubscriptionView` | one per tenant; plan, status, period, trial/grace/cancellation/retention deadlines, usage against limits                                | Remaining trial/grace/retention time is derived from server deadlines and current time. Mutation availability follows server status; `ReadOnly` still permits reads, billing, and tenant export.                                                      |
| `UserView`         | `userId`; email/display name, role, location scope, active state, 2FA state                                                             | Exactly one Owner and deactivation/open-shift constraints are displayed from server results. PIN material is write-only and never returned or stored.                                                                                                 |
| `RoleView`         | fixed role identifier; permission atoms and thresholds                                                                                  | Used to explain access, not to grant it.                                                                                                                                                                                                              |
| `InvitationView`   | `invitationId`; email, role, locations, expiry, acceptance status                                                                       | Invite token appears only in the acceptance route and is removed from the URL after exchange.                                                                                                                                                         |

Subscription states mirror InventoryX:

```text
Trialing -> Active -> PastDue -> ReadOnly -> Cancelled -> PurgePending
    |          ^                                  |
    +-- trial expiry without payment -> Free -----+
```

Upgrade results apply immediately; downgrade and cancellation effects are scheduled
by server dates. The frontend never predicts a successful billing transition.

### Locations, Catalogue, and Inventory

| View model          | Key fields and relationships                                                                                                                                                   | Validation and derived presentation                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LocationView`      | `locationId`; name, address, kind (`Shop`, `Warehouse`, `Both`, `Vehicle`, `Stall`), active state                                                                              | Selection must be inside the session's location scope. Location creation remains plan-capped by the server.                                                                                                                                            |
| `CategoryView`      | `categoryId`; name, optional `parentId`, children                                                                                                                              | Tree cycles and sibling uniqueness are server constraints (FR-090). The client prevents selecting the edited category or its descendants as parent.                                                                                                    |
| `ProductView`       | `productId`; name, description, SKU, barcode, category, unit, `allowFractional`, selling price, optional cost, tax code, tracking mode, status, reorder fields, variant schema | Tracking is `Simple`, `Variant`, or `Batch` in Cycle 1. SKU is tenant-unique; barcode duplication is surfaced using server warning/error semantics. Quantity input is integral unless `allowFractional`; prices and quantities remain decimal strings. |
| `VariantView`       | `variantId`, `productId`; attribute values, SKU, barcode, optional price/cost overrides                                                                                        | Attribute keys and values must satisfy the parent schema. Effective price is variant override or product price.                                                                                                                                        |
| `TaxTreatmentView`  | treatment identifier/code; country and levy components                                                                                                                         | Components are displayed and included in prepared offline pricing evidence, but only InventoryX calculates authoritative tax.                                                                                                                          |
| `StockLevelView`    | composite product, optional variant/batch, and location identity; on-hand, in-transit, quarantined, optional average cost                                                      | Business-wide stock is a server roll-up. Effective offline availability is a separate local derivation and never overwrites this projection.                                                                                                           |
| `StockMovementView` | `movementId`; product/variant/batch, location, signed quantity, optional cost, type, actor, reason, correlation, occurrence time                                               | Append-only. A correction is a new linked movement; no edit/delete affordance exists.                                                                                                                                                                  |
| `BatchView`         | `batchId`; product, batch number, manufacture/expiry dates, remaining quantity, receipt and supplier links, downstream sale links                                              | FEFO order is server-provided/derived from expiry. Expired or recalled states are displayed; client selection cannot bypass server issue rules.                                                                                                        |

### Operational Stock Workflows

| View model            | Key fields and relationships                                                                               | Mirrored state                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StockAdjustmentView` | `adjustmentId`; requester, lines, reason, note, value, optional approver                                   | `AwaitingApproval -> Approved` or `Rejected`; below-threshold server responses may return an already-applied result. Requester cannot approve their own adjustment.                                     |
| `TransferView`        | `transferId`; source, destination, lines with dispatched/received quantities, discrepancy reason           | `Draft -> Dispatched -> Received` or `ReceivedWithDiscrepancy -> Closed`; cancellation is allowed only when the provider accepts it. Dispatched stock is in transit and unavailable at either endpoint. |
| `StockCountView`      | `countId`; scope, location, product/category filter, lines, expected/counted quantities and values, actors | `Open -> Counting -> AwaitingApproval -> Approved` or `Rejected`. Only approval creates permanent count-correction movements.                                                                           |
| `StockConflictView`   | `conflictId`; offline sale, affected stock identities, detected values, status, resolution and actor       | Open conflicts may resolve as `acceptAsIs` or `adjustWithReason`; adjustment creates a permanent movement.                                                                                              |

The UI may optimistically retain form input while a mutation is pending, but it does
not advance these states until InventoryX responds. HTTP `409` refreshes the projection
and shows the competing state; `423` preserves the proposed action for approval.

### Selling, Registers, and Receipts

| View model         | Key fields and relationships                                                                                                                                                         | Validation and derived presentation                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RegisterView`     | `registerId`, `locationId`; name, active state, favourites layout, optional active shift                                                                                             | A register belongs to one location. Server plan limits determine create availability.                                                                                                                              |
| `ShiftView`        | `shiftId`, `registerId`; opener, opening time/float, status, cash movements, closing counted/expected amounts, variance                                                              | Opening float and closing count are decimal strings. One open shift per register. Closing is invalid without a counted drawer and terminates offline authorization.                                                |
| `CashMovementView` | `cashMovementId`, `shiftId`; direction, reason, amount, note, actor/time                                                                                                             | Amount is positive; direction is `CashIn` or `CashOut`; allowed reasons are server-provided/contracted. Expected cash is server-derived.                                                                           |
| `SaleView`         | `saleId`, unique `clientSaleId`; location, register, shift, cashier, status, occurrence time, lines, payments, authoritative subtotal/discount/tax/grand total/change, conflict flag | A completed sale references an open shift. Payments must equal the grand total under server decimal rules. Held sales do not affect stock. Price, tax, and totals displayed after completion come from InventoryX. |
| `SaleLineView`     | `saleLineId`, `saleId`; product, optional variant/batch, quantity, unit price, discount, tax components, total, note                                                                 | Returnable quantity is derived as sold minus already returned quantity. Cost/profit remains permission-sensitive.                                                                                                  |
| `PaymentView`      | child of sale; tender, amount, optional reference                                                                                                                                    | Cycle 1 tenders are `Cash`, `Card`, `MobileMoney`, `BankTransfer`, and `Cheque`. Online authorization is not implied by recording an external tender.                                                              |
| `ReturnView`       | `returnId`, original sale and lines, disposition, refund tender, authorization, totals                                                                                               | Uses original price and tax. Disposition is `ToStock` or `Quarantine`; tender is `Original` or `Cash` in Cycle 1.                                                                                                  |
| `ExchangeView`     | return plus replacement sale and settlement                                                                                                                                          | Net amount is server-derived; positive means collect, negative means refund.                                                                                                                                       |
| `ReceiptView`      | `receiptId`, `saleId`, number, structured payload, created time, delivery log                                                                                                        | Final print/email/SMS/QR output uses authoritative structured content, never reconstructed sale totals.                                                                                                            |

Sale states are mirrored as follows:

```text
Held -> Completed -> PartiallyReturned -> Returned
             |
             +-> Voided (only when the server permits)
```

### Imports and Purchasing

`ImportJobView` is a server-owned resumable workflow with `jobId`, kind
(`Products` or `OpeningStock`), source filename/type, detected columns, mapping,
row previews, row errors/warnings, counts, and status:

```text
Uploaded -> Previewed -> Committed
    |           |
    +-----------+-> Abandoned
```

The browser uploads CSV/XLSX without parsing business rows. Mapping preview is the
server result and commits no catalogue or stock data. SKU failures are row-level;
barcode duplicates retain the provider's warning/error classification. A commit
summary contains created, updated, skipped, and failed counts.

| View model              | Key fields and relationships                                                                                        | Validation and derived presentation                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `SupplierView`          | `supplierId`; identity, contacts, addresses, terms, lead-time days, currency, performance                           | Performance and achieved lead time are server-derived.                                                                                      |
| `SupplierProductView`   | composite supplier/product identity; supplier code, latest price and history                                        | Price fields are decimal strings in the stated currency.                                                                                    |
| `PurchaseOrderView`     | `purchaseOrderId`; supplier, delivery location, origin, expected date, notes, lines, total, approval data, status   | Editable only in `Draft`. Total and threshold outcome are server-authoritative. `ETag` protects edits.                                      |
| `PurchaseOrderLineView` | order/product/variant identity; ordered, received, damaged, outstanding quantities and prices                       | Outstanding is presented from the response or derived as ordered minus accepted receipts using decimal arithmetic. It cannot be negative.   |
| `GoodsReceiptView`      | `goodsReceiptId`; order, supplier, location, receiver/time, actual/damaged quantities, unit costs, optional batches | Batch number/expiry is required when InventoryX requires it for a batch-tracked line. Short, excess, and damage differences remain visible. |
| `SupplierInvoiceView`   | `supplierInvoiceId`; order, invoice reference/date, lines, totals and price-difference flags                        | Differences are provider results, not client tolerance calculations.                                                                        |
| `LandedCostView`        | `goodsReceiptId`; freight, duty, clearing, insurance allocations and resulting item costs                           | Allocation and true cost are server-calculated.                                                                                             |

Purchase order state is mirrored exactly:

```text
Draft -> AwaitingApproval -> Sent -> PartiallyReceived -> FullyReceived -> Closed

Any state before Closed -> Cancelled (only when InventoryX accepts the transition)
```

Only transitions accepted by InventoryX update the query cache. A rejection from an
approval gate returns to the state supplied by InventoryX; the frontend does not infer
whether that is `Draft`, `Rejected`, or another future state.

### Reporting, Notifications, and Audit

| View model                   | Key fields and relationships                                                        | Validation and derived presentation                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardView`              | comparison metrics, warning counts, top sellers, per-metric `detailUrl`             | Deltas and detail destinations use provider values. Profit data is absent without permission.                                     |
| `ReportView`                 | report kind, filters, columns/rows or queued export identity                        | Supported kinds are sales, profit, stock, purchasing, staff, and tax. Dates, location, category, and staff are URL-owned filters. |
| `ExportJobView`              | `jobId`; kind, format, status, progress, expiry, download metadata, error           | Download is enabled only for a completed, unexpired server job.                                                                   |
| `ReportScheduleView`         | `scheduleId`; report kind, filters, cadence, format, recipients, active state       | Cadence is Daily, Weekly, or Monthly; recipients are validated email addresses.                                                   |
| `NotificationView`           | `notificationId`; type, severity, title, occurrence count, read state, target, time | Repeated events may be consolidated; occurrence count is server-owned.                                                            |
| `NotificationPreferenceView` | type-to-channel matrix and thresholds                                               | Channels are InApp, Email, Push, and Sms; server/plan capability determines availability.                                         |
| `AuditEntryView`             | `auditEntryId`; action, actor, target, time, safe metadata                          | Append-only and read-only. Sensitive payloads and credentials are never rendered from telemetry.                                  |

## Client-Local Persisted Entities

The Dexie database is partitioned by authenticated `tenantId` and `registerId`.
Every table includes `partitionKey`; all repository methods require it explicitly.
Changing tenant/register never reuses another partition. Server identifiers are stored
only as foreign references and do not become locally editable records.

### Snapshot Tables

| Entity / primary key                           | Persisted fields                                                                                                                                                                                      | Relationships and indexes                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SnapshotMeta` / `partitionKey`                | `tenantId`, `registerId`, `locationId`, `shiftId`, `watermark`, `snapshotVersion`, `preparedAt`, `lastSuccessfulSyncAt`, `mode` (`Full` or `Incremental`), `contentHash`, `schemaVersion`, `complete` | One active snapshot per partition; indexed by `shiftId`. `complete` becomes true only in the same transaction that installs every child table.             |
| `SnapshotProduct` / `[partitionKey+productId]` | name, SKU, barcode, category, unit, fractional flag, selling price, tax code, tracking/status, sync revision                                                                                          | Indexed by partition + normalized barcode, SKU, status, and product ID. Contains no cost/profit field.                                                     |
| `SnapshotVariant` / `[partitionKey+variantId]` | `productId`, attributes, SKU/barcode, optional selling-price override, sync revision                                                                                                                  | Indexed by partition + product and normalized barcode/SKU.                                                                                                 |
| `SnapshotTaxTreatment` / `[partitionKey+code]` | name, country, ordered tax component evidence, sync revision                                                                                                                                          | Referenced by snapshot products. Tax evidence is displayed/prepared; authoritative acceptance remains an InventoryX gate.                                  |
| `SnapshotStock` / `[partitionKey+stockKey]`    | `productId`, optional `variantId` and `batchId`, on-hand quantity, sync revision                                                                                                                      | `stockKey` is a stable join of product/variant/batch identities. Indexed by partition + product/variant. One register snapshot contains only its location. |
| `SnapshotFavourite` / `[partitionKey+slotKey]` | page/category/slot position, product or variant reference, label/color metadata, sync revision                                                                                                        | Ordered by page and slot; orphan references are ignored and reported after a snapshot update.                                                              |
| `SnapshotReceiptTemplate` / `partitionKey`     | template revision and server-provided printable fields/assets references                                                                                                                              | One per partition. Used for provisional layout only; it cannot assign a fiscal receipt number.                                                             |

Before each shift the preparation transaction writes candidate rows under a new
snapshot version, validates required relationships, switches `SnapshotMeta` atomically,
and removes the prior version. Until InventoryX supplies deletion tombstones, shift
preparation always performs this full replacement. An interrupted candidate with
`complete=false` is discarded on recovery.

### Offline Authorization

`RegisterAuthorization` has primary key `partitionKey` and contains:

- `tenantId`, `registerId`, `locationId`, `shiftId`, `userId` and permission digest;
- `authorizedAt`, provider token expiry, `offlineDeadline`, and last online validation;
- wrapped reduced register credential and Web Crypto key reference;
- state (`Preparing`, `Ready`, `Locked`, `Expired`, or `Closed`);
- snapshot version/hash bound to the authorization; and
- `lockedAt` and non-sensitive lock reason when applicable.

`offlineDeadline` is the earliest of token expiry, shift close, and 12 hours after the
last online authorization. The normal user refresh token is never persisted. Explicit
sign-out deletes decrypted material and changes `Ready` to `Locked` without deleting
the snapshot or queue. Because InventoryX has no offline PIN verifier, a locked record
requires online reauthentication and PIN exchange; the client never implements local
PIN verification.

```text
Unprepared -> Preparing -> Ready -> Locked -> Ready (online authorization only)
                    |         |
                    +-> Expired
                    +-> Closed
```

Offline completion is permitted only when authorization is `Ready`, its snapshot is
complete and bound to the same shift, current time precedes `offlineDeadline`, and the
sale uses no live-only action.

### Immutable Offline Sale and Outbox State

`OfflineSaleEnvelope` uses `clientSaleId` as its primary key. The following fields are
immutable after the atomic completion transaction:

- ownership: `partitionKey`, `tenantId`, `registerId`, `locationId`, `shiftId`,
  `cashierId`;
- identity/time: UUID `clientSaleId`, `occurredAt`, local sequence and schema version;
- lines: product, optional variant/batch, decimal quantity, captured unit price,
  discount, note, and required historical price/tax evidence;
- payments: Cycle 1 tender, decimal amount, and optional external reference;
- locally calculated display subtotal, discount, tax, grand total, and change;
- snapshot version/watermark and authorization timestamp used at completion;
- canonical `payloadHash`; and
- provisional receipt ID.

The historical price/tax evidence and provider acceptance schema are part of the
InventoryX readiness gate. Fixtures may exercise them, but production offline sales
MUST remain disabled until generated OpenAPI and provider tests define and accept the
same fields. Local totals are evidence for the pending receipt, not authoritative
InventoryX totals.

`OfflineSaleState` also uses `clientSaleId` and holds mutable delivery metadata:

- `status`, `locked`, queue position, next eligible attempt, and retry count;
- last attempt/result IDs and sanitized RFC 7807 status/code/trace ID;
- authoritative `saleId` and receipt ID when applied;
- conflict ID when the provider result is `applied_with_conflict`;
- `appliedSnapshotVersion` after refresh; and
- manager reconciliation reference once the provider contract supports it.

Allowed transitions are:

```text
Pending -> Syncing -> AppliedAwaitingSnapshot -> Applied
   ^          |
   |          +-> AppliedWithConflictAwaitingSnapshot -> AppliedWithConflict
   |          +-> Rejected
   +----------+ (retry same immutable identity after ambiguous/transient failure)
```

Local `AppliedWithConflict` is the durable projection of the provider result
`applied_with_conflict`. UI copy and tests MUST use that provider enum name.

Only one transaction creates an envelope, its initial `Pending` state, stock overlays,
and provisional receipt. `Syncing` is a lease, not a new payload. A crash or ambiguous
network response returns the record to `Pending` and resubmits the same identity and
hash. `Rejected` is locked and immutable; it can leave that state only through the
future authoritative retry/reconciliation contract. Editing produces neither a new
version nor an implicit replacement sale.

`SyncAttempt` uses `attemptId` as primary key and contains `clientSaleId`, partition,
start/end times, lease/leader ID, trigger (`online`, `focus`, `manual`, `startup`),
request hash, outcome, retry classification, HTTP status and safe problem `traceId`.
It never stores credentials, receipt destinations, raw response bodies, or sale lines.

Web Locks elect one sync leader per partition. `BroadcastChannel` carries only queue
status/version notifications; another tab reads records through the scoped repository.

### Stock Overlays

`StockOverlay` has compound primary key `[clientSaleId+stockKey]` and fields
`partitionKey`, product/variant/batch references, positive sold quantity, creation time,
and retirement snapshot version.

For a stock identity:

```text
effective quantity = snapshot on-hand - sum(active overlay sold quantities)
```

Active overlays belong to `Pending`, `Syncing`, `Rejected`, `AppliedWithConflict`, or applied
sales whose resulting snapshot has not installed. An applied overlay retires only in
the same transaction that installs a snapshot known to include that sale. A rejected
or contested overlay stays visible until authoritative reconciliation prevents the UI
from suggesting that already-released goods returned to stock. Negative effective
quantity is allowed but flagged; it is never silently clamped to zero or written into
`SnapshotStock`.

### Local Receipts

`LocalReceipt` has primary key `receiptKey` and fields `partitionKey`, `clientSaleId`,
kind (`Provisional` or `FinalReference`), created time, provisional structured content
and QR payload, print status, authoritative receipt/sale references, final content hash,
and optional `supersededAt`. Final structured content remains an online query response;
only its bounded reference is persisted.

```text
Provisional -> Superseded
clientSaleId -> FinalReference (separate record)
```

A provisional receipt is visibly marked `Pending sync`, uses the client sale ID rather
than an invented fiscal number, and is printable/QR-renderable offline. Synchronization
does not mutate it into a final receipt. The final structured receipt is fetched from
InventoryX and offered separately; only its bounded reference and content hash are
persisted. Email and SMS delivery are online-only server actions.

## Client-Only Ephemeral Models

| Model               | Lifetime and rules                                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CartState`         | Memory for the active register route. Lines reference the current snapshot/query product and retain decimal quantities. Reducer actions are add, remove, set quantity, set allowed discount/note, and clear. It becomes immutable only when converted to an online request or offline envelope. |
| `CheckoutDraft`     | Memory-only tender allocations and manager-authorization result. Valid only for the active cart revision and shift. Payment sum, cash change, and display totals use Decimal.js; server response replaces them online.                                                                          |
| `FormDraft`         | React Hook Form state. Preserved across recoverable `402`, `409`, or `423` responses in memory; persisted only when a requirement explicitly introduces draft recovery.                                                                                                                         |
| `RouteSearch`       | Typed URL state for filters, sort and pagination. Page starts at 1; page size is 1-200. Sensitive values, tokens, receipt destinations, and notes never enter the URL.                                                                                                                          |
| `ConnectivityState` | `Unknown`, `Online`, `Degraded`, or `Offline`, derived from recent API probes plus browser events. `navigator.onLine` is only a hint. It never makes a live-only action available by itself.                                                                                                    |

## Cross-Entity Invariants

1. Every server query and local repository operation is scoped to the authenticated
   tenant; register-local operations additionally require the matching register,
   location, shift, user, and partition.
2. All money and quantity parsing is exact decimal arithmetic. Currency rounding is
   for display only; transmitted strings and provider totals are preserved.
3. The client never adds a missing permission, cost field, plan feature, or location
   based on role-name assumptions.
4. ETag-protected mutations send the exact last received tag. A conflict retains user
   input and requires refresh/review; no last-write-wins retry occurs.
5. Idempotent mutations retain one client UUID across retries. Offline sale payload and
   hash cannot change after completion.
6. Query data is cleared on identity/tenant changes. Decrypted register state is
   cleared on identity, tenant, location, register, shift, expiry, or sign-out changes.
7. Cache Storage contains only versioned public shell assets. API responses, generated
   reports, receipts, credentials, and tenant images are excluded.
8. Service-worker/database upgrades never activate mid-shift when incompatible with
   the active schema. Storage failure blocks a new offline sale before payment is
   accepted and preserves already committed records.
9. Live-only actions remain disabled offline: other-location availability, online card
   authorization, subscription/billing mutation, email/SMS receipt delivery, and every
   action not explicitly covered by the register sync contract.
10. Server workflow responses always win over locally anticipated state. Mirrored
    import, stock, sale, subscription, purchase-order, export, and approval states are
    replaced from successful responses or invalidated/refetched after mutation.

## Deletion and Retention

- Query projections follow normal cache garbage collection and are removed immediately
  on sign-out or tenant change.
- A sign-out locks but does not delete the matching register snapshot, outbox, overlays,
  attempts, or receipts. Other identities cannot read decrypted records.
- Applied envelopes and final references are retained only for the configured bounded
  reconciliation window after the authoritative snapshot contains them. Pending,
  `rejected`, and `applied_with_conflict` records cannot be evicted automatically.
- Storage-pressure cleanup removes obsolete app-shell caches, abandoned incomplete
  snapshot candidates, and eligible applied history in that order. It never removes
  an active snapshot, authorization metadata, unresolved sale, overlay, or provisional
  receipt.
- Tenant cancellation/deletion and the backend's 90-day retention policy do not permit
  the browser to retain business data indefinitely. After authoritative deletion or
  unrecoverable tenant access loss, the matching local partitions are cryptographically
  erased and deleted when the app next runs online.
