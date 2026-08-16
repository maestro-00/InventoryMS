# Contract: InventoryX API Integration

## Generated Boundary

- Base contract: InventoryX `/api/v1` OpenAPI plus reviewed Cycle 1 contract documents.
- Snapshot location: `openapi/inventoryx-v1.json`.
- Generated types: `src/shared/api/generated/`.
- Transport: one `openapi-fetch` client configured by `src/shared/api/client/`.
- Generated files are read-only. CI regenerates them and fails on drift.
- Feature modules call domain query/mutation functions; raw `fetch` is forbidden
  outside the API and service-worker boundaries.

## Request Context

| Context  | Credential                          | Required Scope Behavior                                                           |
| -------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| Public   | none                                | Registration, login, plans, invitation acceptance only                            |
| User     | memory access token                 | Tenant inferred by server claim; location/permission enforced by server           |
| Register | wrapped active-shift register token | Sync surface only; request register must equal token register after provider gate |

Tenant ID is never sent as an arbitrary request selector. Query keys include tenant,
location, register, permission/plan revision, resource, and normalized filters. Any
identity or scope transition cancels in-flight work and clears scoped caches before the
new route renders.

Normal access tokens remain in memory. Refresh is single-flight: concurrent 401s wait
for one refresh and retry at most once. Refresh failure clears decrypted state, locks
the offline partition, preserves recoverable non-sensitive drafts, and routes to login.

## Standard Headers

| Header               | Direction        | Rule                                                       |
| -------------------- | ---------------- | ---------------------------------------------------------- |
| Authorization        | request          | Bearer user or register token selected by operation policy |
| Accept               | request          | JSON/problem JSON except document downloads                |
| If-Match             | mutation request | Required when the latest representation supplied an ETag   |
| Idempotency identity | sale payload     | Stable `clientSaleId`; never regenerated for retry         |
| ETag                 | response         | Store with the exact aggregate/query record; never parse   |
| Content-Disposition  | response         | Sanitize filename before download                          |

## Problem Details Mapping

Every non-success response is normalized to `AppProblem`:

```text
kind: validation | unauthenticated | forbidden | planLimit | readOnly |
      stale | approvalRequired | rateLimited | transient | notFound | unknown
status: number
title/detail: safe user-facing source text
traceId: optional support reference
fieldErrors: map<string, string[]>
extensions: allowlisted structured values only
retryAfter: optional instant/duration
```

| Status      | Frontend Contract                                                           |
| ----------- | --------------------------------------------------------------------------- |
| 400         | Preserve form/cart; attach field errors; focus/announce summary             |
| 401         | Single refresh/retry; otherwise clear session and reauthenticate            |
| 402         | Preserve work; show limit/current/upgrade hint or read-only recovery        |
| 403         | Remove forbidden affordance after refresh; show denial without leaking data |
| 404         | Show resource-not-found state; do not convert to empty collection           |
| 409         | Treat as stale/state conflict; fetch current data before any resubmit       |
| 423         | Preserve pending action; route to eligible approval flow                    |
| 429         | Honor Retry-After; disable repeated submit; show retry time                 |
| 5xx/network | Safe retry for idempotent reads or explicitly idempotent mutations only     |

Raw response bodies, tokens, receipt destinations, sale lines, and financial payloads
MUST NOT be logged. A safe `traceId` may be displayed and sent through telemetry.

## Decimals and Time

- Transport and generated boundary treat money and quantities as decimal strings.
- Decimal.js performs provisional formatting/arithmetic; server totals remain final.
- Quantity input accepts at most three decimal places and respects `AllowFractional`.
- UTC timestamps remain unchanged in state/persistence; date-fns localizes display.
- `OccurredAt` is business time; `CreatedAt` is server processing time. They are never
  substituted for one another.

## Paging, Filtering, and Cancellation

- Request `page >= 1` and `1 <= pageSize <= 200`.
- Lists expose `items`, page, page size, total count, and navigation state.
- Filter/sort/page state lives in validated URL search parameters.
- Changing filters cancels obsolete requests; late responses cannot replace newer keys.
- Empty collection is distinct from failure and from a filtered no-results state.

## Concurrency

Mutable aggregate queries retain their ETag beside the relevant query record. Mutation
forms submit `If-Match`. On 409, retain user input separately, fetch current server
state, show the conflicting values and available recovery, and require a fresh explicit
submission. Automatic overwrite is prohibited.

## Downloads and Long Jobs

Document/spreadsheet downloads use authenticated streaming/blob handling, validated
content type, and sanitized server filenames. Long exports expose queued, processing,
completed, failed, and expired states; polling stops when the route is hidden and
resumes on return. A download URL is never assumed permanent.

## OpenAPI Conformance Gate

CI MUST verify:

- all consumed paths/methods and operation metadata exist;
- generated client has no diff;
- RFC 7807 extensions used by the UI remain typed/fixture-tested;
- ETag/If-Match and page maxima remain documented;
- live-only operations are detectable;
- sync snapshot and result DTOs satisfy [offline-sync.md](./offline-sync.md).

P4 provider tests remain release-blocking until the readiness gate in the plan passes.
