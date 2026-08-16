# Research: Inventory and POS Frontend

**Date**: 2026-08-09
**Scope**: Technology, architecture, migration, integration, offline reliability, and
quality decisions for the InventoryX Cycle 1 frontend.

Package versions below were checked against the npm registry on 2026-08-09. Exact
versions will be locked by the package-manager lockfile; upgrades require the
constitution's compatibility and verification checks.

## R1. Rewrite Strategy

**Decision**: Replace the existing application in place while preserving repository
history. Reuse only audited visual assets and accessible UI primitives that conform to
the new design system and tests. Replace the application shell, routes, pages, auth
context, hand-written services, state ownership, styling foundation, and build/quality
configuration.

**Rationale**: The current prototype targets legacy endpoints, contains Supabase and
local-storage auth assumptions, has no durable offline database or service worker, and
has no automated test stack. Incremental adaptation would preserve incompatible
contracts and create two competing architectures.

**Alternatives considered**:

- Incremental page migration: rejected because shared auth, routing, API, and state
  foundations are already incompatible.
- New repository: rejected because an in-place rewrite preserves history, governance,
  deployment identity, and useful audited assets.

## R2. Runtime and Package Management

**Decision**: Node.js 24 LTS, pnpm 11.20.0, React 19.2.8, TypeScript 6.0.3, Vite 8.2.1,
and `@vitejs/plugin-react-swc` 4.3.3. Commit one `pnpm-lock.yaml`; remove the npm and Bun
lockfiles during implementation.

**Rationale**: Node 24 is the production LTS line. pnpm provides deterministic,
space-efficient installs and strict dependency boundaries. TypeScript 6.0.3 is the
newest stable release compatible with `typescript-eslint` 8.66.0, which currently
supports TypeScript below 6.1. Vite 8 and SWC provide a fast, standards-based SPA build.

**Alternatives considered**:

- TypeScript 7.0.2: rejected until the type-aware lint ecosystem officially supports
  it; selecting it now violates the compatibility requirement.
- npm/Bun: both are viable, but retaining two lockfiles is unacceptable. pnpm gives the
  strongest dependency isolation for this large client.
- Next.js or TanStack Start: rejected because SSR and a second server runtime add no
  material value to an authenticated offline POS and complicate service-worker/auth
  behavior.

## R3. Application Framework and Navigation

**Decision**: Build a client-rendered progressive web application with TanStack Router
1.170.24 and its Vite router plugin. Use typed file routes, validated URL search
parameters, route-level lazy loading, and route guards derived from authenticated
permission, location, register, subscription, and feature state.

**Rationale**: The application has many deep operational workflows and filterable
views. Typed paths and search parameters reduce navigation errors, while a static SPA
can be installed and cached without introducing a server-side rendering tier.

**Alternatives considered**:

- React Router 7: capable and familiar, but provides weaker end-to-end typing for route
  parameters and search state in this workflow-heavy application.
- Angular: cohesive but would discard the existing React/Radix ecosystem without a
  compensating backend or offline advantage.

## R4. State Ownership

**Decision**: TanStack Query 5.101.4 owns online server state; URL search parameters own
shareable filters; React Hook Form 7.85.0 plus Zod 4.4.3 own forms and boundary
validation; local component state is the default for transient UI. A small explicit
store/reducer may own the active POS cart and sync coordinator only. Dexie, not React
Query persistence, owns durable register data.

**Rationale**: Separate owners prevent remote, persisted, and transient state from
drifting into one global store. Backend calculations and state machines remain
authoritative.

**Alternatives considered**:

- One global Zustand or Redux store: rejected because it conflates server, durable,
  URL, form, and transient state.
- Persisted TanStack Query as the offline ledger: rejected because query caches are not
  transactional financial outboxes.
- XState for every workflow: rejected as unnecessary abstraction; typed discriminated
  states and reducers are sufficient unless a local workflow proves otherwise.

## R5. InventoryX API Contract

**Decision**: Commit a reviewed InventoryX OpenAPI v1 snapshot. Generate TypeScript
types with `openapi-typescript` 7.13.0 and call the API through `openapi-fetch` 0.17.0
behind one adapter. CI regenerates the snapshot/client and fails on drift. Hand-written
DTO duplication is forbidden.

The adapter centralizes:

- `/api/v1` base URL and bearer or register-scoped authorization;
- memory-first access tokens and single-flight refresh;
- RFC 7807 normalization including field errors, `traceId`, and upgrade hints;
- explicit handling for 401, 402, 403, 409, 423, 429, and transient 5xx responses;
- ETag capture and `If-Match` submission;
- tenant/location/register-aware query keys and cache clearing on scope changes;
- page size enforcement at 200 or less;
- decimal money and quantities as strings at transport and persistence boundaries;
- cancellation and stale-response protection.

**Rationale**: Generated types plus one policy adapter keep the frontend aligned with
the implemented backend without scattering transport behavior across features.

**Alternatives considered**:

- Hand-written services and DTOs: rejected because the current implementation already
  demonstrates contract drift.
- Orval-generated feature hooks: viable, but hides more policy in generation and makes
  offline/live ownership harder to audit.
- GraphQL: rejected because InventoryX exposes a versioned REST contract.

## R6. Offline Database and Synchronization

**Decision**: Use Dexie 4.4.4 over IndexedDB for the register-scoped snapshot and
immutable sale outbox. Use `vite-plugin-pwa` 1.3.0 with a custom Workbox 7.4.1 service
worker in `injectManifest` mode for the app shell only. All authenticated API traffic
is NetworkOnly; business data never enters Cache Storage.

The local database is partitioned by tenant and register and stores snapshot metadata,
products, variants, taxes, stock, favourites, receipt template, open-shift authorization,
immutable queued sales, local stock overlays, sync attempts, receipts, and
reconciliation links. Completing an offline sale writes its outbox record and stock
overlay in one transaction. The cached server snapshot is never mutated by pending
sales; effective availability is the snapshot minus active overlays.

Only one tab may synchronize a tenant/register queue. A Web Lock provides leadership,
BroadcastChannel shares status, and stale leases recover after timeout. Foreground sync
runs on startup, connectivity restoration, visibility/focus, bounded retry timers, and
manual retry. Background Sync is an optional wake signal, never a correctness
dependency. Retry with exponential backoff and jitter only for network errors, 429, and
transient 5xx responses.

**Rationale**: IndexedDB transactions and explicit per-sale states are required for
financial durability, crash recovery, idempotency, manager-locked rejection, and stock
overlay correctness. Browser background execution is not reliable enough to own sync.

**Alternatives considered**:

- localStorage: rejected for synchronous access, poor capacity, and no transactions.
- Workbox Background Sync as the queue: rejected because it cannot model per-sale
  outcomes, locks, receipts, or reconciliation.
- PouchDB/RxDB: rejected because generic replication does not match InventoryX command
  semantics and adds substantial complexity.

## R7. Authentication and Local Security

**Decision**: Keep normal access tokens in memory and never in localStorage. Persist
only the open shift's reduced register credential when offline continuity requires it,
bounded by server expiry, shift closure, and the clarified 12-hour maximum. Partition
all durable records by tenant/register and wrap sensitive local values with Web Crypto
using non-extractable device key material. Explicit sign-out deletes the persisted
credential and locks, but does not delete, the queue and snapshot. Unlock requires
online authorization for the same tenant/register.

Apply a strict content security policy, avoid third-party scripts on POS routes, request
camera permission only when scanning starts, scrub financial/auth data from telemetry,
and clear Query caches and decrypted in-memory state on every scope transition.

**Rationale**: Browser storage cannot equal native secure storage. Short-lived scoped
credentials, encryption at rest, CSP, narrow data ownership, and online reauthorization
minimize exposure while preserving the required queue.

**Alternatives considered**:

- Persist user refresh tokens: rejected because it increases XSS impact and is not
  needed for a locked offline queue.
- Offline PIN verification: rejected because InventoryX has no offline verifier
  contract and duplicating password verification on the client is unsafe.

## R8. UI System, Responsiveness, and Accessibility

**Decision**: Tailwind CSS 4.3.3 with `@tailwindcss/vite`, shadcn/ui 4.16.2 source
components built on audited Radix primitives, and Lucide React 1.30.0. Establish design
tokens for color, typography, density, focus, motion, and stable control dimensions.
Operational pages use dense, unframed layouts; dialogs and repeated records use cards
only where semantically appropriate.

Support current and previous major Chrome, Edge, Firefox, and Safari plus current and
previous Android Chrome and iOS Safari. Build for ES2022. Every changed critical journey
is checked at 320x800, 768x1024, and 1440x900, 200% zoom, reduced motion, keyboard-only
operation, and WCAG 2.2 AA. Primary mobile actions use at least 44x44 CSS pixel targets.

**Rationale**: Source-owned primitives remain customizable and testable while preserving
accessible interaction patterns. The explicit matrix covers desktop counter hardware
and mobile stock workflows.

**Alternatives considered**:

- Keep every existing UI component: rejected; only individually audited components may
  survive the rewrite.
- A monolithic commercial component suite: rejected because it adds visual and bundle
  weight and makes POS-specific interaction harder to control.

## R9. Domain-Specific Client Libraries

**Decision**:

- MiniSearch 7.2.0 for offline typo-tolerant catalogue search;
- `@zxing/browser` 0.2.1 for camera scanning, with native BarcodeDetector as an
  enhancement and hardware keyboard-wedge handling as the primary scanner path;
- Decimal.js 10.6.0 for provisional money/quantity math, with InventoryX always
  authoritative;
- TanStack Table 9.1.2 for accessible, virtualizable data tables;
- Recharts 3.10.1, lazy loaded with tabular fallbacks, for management charts;
- date-fns 4.4.0 for localized display while preserving UTC business timestamps;
- qrcode.react 4.2.0 for explicitly provisional or authoritative QR receipts.

CSV/XLSX imports are uploaded to InventoryX and rendered from its preview; no browser
spreadsheet parser is introduced.

**Rationale**: These mature libraries solve established parsing, search, decimal, table,
chart, and scanning problems without inventing domain engines.

**Alternatives considered**:

- Custom barcode decoding, fuzzy search, decimal arithmetic, or table virtualization:
  rejected as high-risk reinvention.
- ECharts: capable but unnecessary bundle and configuration weight for Cycle 1 reports.

## R10. Test-First and Quality Toolchain

**Decision**: Vitest 4.1.10, jsdom 30.0.1, React Testing Library 16.3.2, user-event
14.6.3, jest-dom 7.0.0, MSW 2.15.0, and fake-indexeddb 6.2.5 for unit, component, and
integration tests. Playwright 1.62.1 plus `@axe-core/playwright` 4.12.1 provides real
browser, offline, service-worker, responsive, and accessibility tests. ESLint 10.8.1,
typescript-eslint 8.66.0, React Hooks 7.1.1, jsx-a11y 6.10.2, and Prettier 3.9.6 enforce
static quality.

Tests are written and observed failing before behavior. Required layers are:

1. Unit: money, permissions, cart transitions, queue states, retry rules, and 12-hour
   authorization.
2. Component: all loading, empty, validation, denied, stale, approval, read-only,
   offline, and recoverable failure states.
3. Contract/integration: generated schema drift, RFC 7807, ETags, decimals, paging,
   permissions, and sync outcomes with MSW and a seeded InventoryX instance.
4. End to end: one journey per user story. Pull requests require P1-P3 E2E; P4 offline
   E2E is gated until InventoryX readiness tasks T101-T110 pass.
5. Accessibility and responsive: automated axe plus manual keyboard and screen-reader
   release checks.

Coverage gates are 85% lines/functions and 80% branches globally, and 95% lines with
90% branches for money, permission, mutation-idempotency, and offline modules. Coverage
does not replace behavioral acceptance.

**Alternatives considered**:

- Jest: rejected because Vitest shares the Vite/ESM transform pipeline.
- Cypress: rejected because Playwright better fits multi-engine, service-worker,
  browser-context, and offline persistence testing.
- Snapshot-heavy testing or 100% coverage: rejected as brittle proxies for behavior.

## R11. Performance and Delivery Budgets

**Decision**: Enforce the following against deterministic production builds:

- p75 LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.10;
- authenticated route usable <= 3 s on the defined mid-range mobile/4G profile;
- initial compressed JavaScript <= 250 KiB and total initial transfer <= 500 KiB;
- any lazy route chunk <= 150 KiB compressed;
- cached barcode-to-cart <= 200 ms p95 (automated merge gate for SC-002; the spec's
  1-second bar remains the user-facing criterion);
- offline sale transaction <= 100 ms p95 and 100-sale recovery <= 2 s;
- sale-to-visible online history/stock <= 2 s p95;
- report result <= 3 s p95 or queued acknowledgement <= 2 s;
- Lighthouse CI performance >= 0.90, accessibility >= 0.98, best practices >= 0.95.

Route-level splitting is mandatory for scanner, reports/charts, import, administration,
and other non-POS features. Field Core Web Vitals and error rates are reviewed after
release; deterministic CI budgets remain regression gates.

**Alternatives considered**:

- One application bundle: rejected because it jeopardizes the POS startup budget.
- Lighthouse scores alone: rejected because scores are supporting evidence, not field
  performance or domain-interaction measurements.

## R12. Observability

**Decision**: Introduce a small telemetry boundary with structured, scrubbed client
errors, route timing, Core Web Vitals, sync transitions, queue depth, retry reason,
storage pressure, service-worker version, and contract `traceId`. Use Sentry React
10.69.0 only when a deployment DSN and privacy review are present; otherwise the
boundary is no-op in production and console-backed in development. Never capture sale
lines, credentials, tokens, receipt destinations, or raw request/response bodies.

**Rationale**: A defined boundary makes offline failures diagnosable without coupling
features to one vendor or leaking business data.

**Alternatives considered**:

- Direct Sentry calls throughout features: rejected as vendor coupling.
- No client telemetry: rejected because offline queue and service-worker failures would
  be difficult to diagnose.

## R13. InventoryX Readiness Gate

**Decision**: Treat InventoryX as the authoritative server and do not simulate missing
server guarantees. P1-P3 and P5-P10 frontend work may proceed against reviewed
contracts, but production completion of P4 is blocked until the contract documents,
generated OpenAPI, and implementation agree on these points:

1. Enforce a register-token authorization policy that permits only the documented sync
   surface and requires the token's register to match each request.
2. Define historical offline price/tax acceptance so a tax or price change during an
   outage cannot silently change money already collected.
3. Add an authoritative rejected-sale review/retry/reconciliation contract and linked
   audit record.
4. Reconcile the snapshot contract with implementation for favourites, receipt
   template, fractional-sale and tracking metadata, live-only/discount policy, and
   deletion behavior. Until tombstones exist, preparation uses a transactional full
   replacement snapshot before each shift rather than incremental deletion handling.

The frontend can compose the preparation bundle from existing online endpoints and can
fetch a new snapshot after applied sales, but it cannot repair authorization, fiscal,
or reconciliation guarantees locally.

**Rationale**: Shipping client workarounds would violate the specification, tenant
security, financial correctness, and the constitution's documented-contract rule.

**Alternatives considered**:

- Weaken the clarified offline behavior: rejected because it contradicts accepted
  requirements.
- Infer or duplicate backend rules in the browser: rejected because the backend is the
  stated source of truth.
- Block the entire frontend: rejected because independent online user stories can be
  designed and implemented while the P4 contract gate is resolved.
