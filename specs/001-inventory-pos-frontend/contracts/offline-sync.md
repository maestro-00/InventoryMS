# Contract: Offline Register and Synchronization

## Provider Readiness

This contract is the required frontend behavior. Production integration is blocked
until InventoryX satisfies the readiness gate in [plan.md](../plan.md), especially
register-token scoping, historical fiscal acceptance, rejected-sale reconciliation,
and snapshot completeness/versioning.

## Preparation Contract

Offline readiness requires one successful online transaction-like sequence:

1. Authenticate the user and select an assigned location/register.
2. Obtain a register-scoped credential and its server expiry.
3. Load a full shift preparation bundle: products, variants, prices, tax rules,
   fractional/tracking metadata, stock, favourites, and receipt template.
4. Validate every boundary and write a full replacement IndexedDB snapshot atomically.
5. Open the shift online and bind its ID to the prepared partition/version.
6. Mark readiness `ready` with the earlier of credential expiry and 12 hours.

Failure at any step leaves the previous partition locked/stale and blocks new offline
completion. A prepared open shift remains usable when connectivity later drops. Shift
close, deadline expiry, sign-out, or scope change ends readiness.

## Service Worker Boundary

The custom service worker may:

- precache versioned app-shell/static assets;
- provide navigation fallback to the installed shell;
- stage and announce application updates;
- emit optional wake signals where Background Sync exists.

It MUST NOT cache authenticated API responses, own the sale queue, decrypt register
records, or decide financial retry. API requests use NetworkOnly. An incompatible
schema update waits until no active shift before activation.

## Local Completion Contract

`completeOfflineSale(cart)` MUST execute one IndexedDB transaction that:

1. Verifies partition is unlocked and readiness deadline has not passed.
2. Verifies storage quota can accept the sale without endangering the existing queue.
3. Validates cart, tender, fractional, product, and snapshot references.
4. Creates a stable UUID `clientSaleId` and canonical immutable request payload.
5. Computes/stores payload hash.
6. Creates immutable OfflineSale in `pending` state.
7. Creates all local stock overlays.
8. Creates an immutable provisional receipt labelled `Pending sync`.
9. Commits all records before clearing the cart or reporting success.

Any failure rolls back every write and preserves the cart. A provisional receipt is
not fiscal/final and includes client sale ID, register, shift, occurrence time, lines,
provisional tax/totals, tenders, and a QR payload whose type is explicitly provisional.

## Effective Availability

```text
effective quantity = cached server quantity - active local overlays
```

Active overlays include pending, syncing, rejected, `applied_with_conflict`, and
applied-but-not-yet-snapshotted sales because goods have physically left even if the
server has not incorporated or accepted the sale. The cached server snapshot is never
mutated directly by local sale completion.

## Leader and Lease Contract

- One Web Lock named by tenant/register elects the sync leader.
- Other tabs receive state via BroadcastChannel and never upload concurrently.
- A leader leases selected pending sales with an expiry in one transaction.
- Expired `syncing` leases recover to pending after startup validation.
- Upload batches are bounded and each result is matched by client sale ID.
- A tab that loses lock/visibility may finish its in-flight request but MUST NOT lease a
  new batch until leadership is confirmed.

## Retry Matrix

| Outcome                              | Automatic Action                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Offline/network/ambiguous disconnect | Return same immutable identity to pending; exponential backoff with jitter                |
| 429                                  | Honor Retry-After, then same identity                                                     |
| Transient 5xx                        | Bounded backoff, same identity                                                            |
| 401/403                              | Stop queue, lock/re-authorize; no blind retry                                             |
| `applied`                            | Store server sale ID; fetch/merge snapshot; then retire overlay and fetch final receipt   |
| `applied_with_conflict`              | Store server ID/conflict; merge snapshot; retain visible conflict until server resolution |
| `rejected`                           | Stop automatic retry; immutable manager-locked record                                     |
| Invalid/missing result identity      | Stop batch and raise contract failure; do not guess                                       |

After an applied result, the overlay retires only in the same transaction that merges a
snapshot known to contain the server effect. Retrying an ambiguous request always uses
the same client sale ID and payload hash.

## Rejected Sale Contract

A rejected sale remains immutable and visible only to an authorized manager after the
same partition is unlocked. The UI displays normalized rejection reason and trace ID.
The future provider contract must support exactly one of:

- release of the unchanged identity for retry after its cause is resolved; or
- linked authoritative reconciliation/compensating records.

The original may never be edited, deleted, or silently marked applied. A cashier cannot
resolve a rejected sale. Until the provider readiness contract exists, UI resolution
uses fixtures only and is not production-enabled.

## Receipt Contract

- Provisional receipt is created from immutable queued sale, never the mutable cart.
- It is always marked `Pending sync`; rejection/conflict status remains visible.
- Applied outcome creates a separate final server receipt record.
- Printed provisional identity is never silently replaced by the final number.
- Email/SMS delivery is final-receipt/live-only.
- QR payload declares provisional/final type and identity.

## Authorization and Lock Contract

- Effective offline deadline is earliest of register credential expiry, shift close,
  and 12 hours after last online authorization.
- On deadline, preserve cart/queue but block new completion.
- Explicit sign-out deletes persisted credential, clears decrypted memory, marks
  partition locked, and exposes no queue count/details to the next session.
- Unlock requires online user authorization/PIN exchange for the same tenant/register.
- Another tenant/register can never query, display, count, or synchronize the partition.

## Storage Pressure and Recovery

- Request persistent storage for prepared registers and record storage estimates.
- If a new sale cannot commit durably, block completion with actionable guidance; do
  not remove older queue records automatically.
- Startup validates schema, hashes, leases, partition ownership, and readiness before
  rendering queue details.
- Database migration tests cover every released schema with representative 100-sale
  fixtures.
- Corruption locks the partition and produces a support-safe diagnostic; it never
  silently resets financial records.

## Required Browser Tests

1. Atomic completion and simulated crash at each transaction step.
2. Reload and new browser context recovery.
3. Sign-out lock and same-register unlock; cross-tenant/register denial.
4. 100-sale queue recovery within 2 seconds.
5. Multi-tab leader election, stale lease, and duplicate-result handling.
6. Network loss before/during/after upload and same-ID replay.
7. Applied snapshot merge before overlay retirement.
8. Rejected manager lock and linked reconciliation fixture.
9. Provisional/final receipt separation.
10. Shift close, token expiry, and exact 12-hour cutoff.
11. Quota denial preserving cart/existing queue.
12. Service-worker update waiting for compatible shift/database state.
