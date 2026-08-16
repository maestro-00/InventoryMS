# Implementation Plan: Inventory and POS Frontend

**Branch**: `(none; Spec Kit feature 001-inventory-pos-frontend)` | **Date**:
2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from
`/specs/001-inventory-pos-frontend/spec.md`

## Summary

Replace the existing prototype in place with a typed, test-first, installable React
web application aligned to InventoryX Cycle 1. The application uses generated OpenAPI
types, explicit state ownership, route-level access gates, and a Dexie-backed offline
sale ledger. InventoryX remains authoritative for permissions, stock, tax, money,
state transitions, and plan enforcement.

The rewrite preserves repository history but carries forward only audited assets and
accessible UI primitives. Legacy pages, services, Supabase remnants, local-storage
auth assumptions, duplicate lockfiles, and incompatible routes are removed as their
tested replacements land. P4 offline implementation has an explicit backend readiness
gate described below; client code MUST NOT simulate missing server guarantees.

## Technical Context

**Language/Version**: TypeScript 6.0.3 in strict mode; React 19.2.8; HTML5; CSS via
Tailwind CSS 4.3.3; Node.js 24 LTS for development and CI

**Primary Dependencies**: Vite 8.2.1 + SWC; TanStack Router 1.170.24; TanStack Query
5.101.4; React Hook Form 7.85.0; Zod 4.4.3; openapi-typescript 7.13.0;
openapi-fetch 0.17.0; Dexie 4.4.4; vite-plugin-pwa 1.3.0 + Workbox 7.4.1;
Tailwind CSS 4.3.3; shadcn/ui 4.16.2 source components with Radix; MiniSearch 7.2.0;
Decimal.js 10.6.0; TanStack Table 9.1.2; Recharts 3.10.1; date-fns 4.4.0;
`@zxing/browser` 0.2.1; qrcode.react 4.2.0; Lucide React 1.30.0

**Storage**: InventoryX is the authoritative remote store. IndexedDB via Dexie stores
only tenant/register-scoped offline snapshots, open-shift authorization metadata,
immutable sale outbox records, stock overlays, sync attempts, and provisional/final
receipt references. Cache Storage contains versioned application-shell assets only.

**Testing**: Vitest 4.1.10, jsdom 30.0.1, React Testing Library 16.3.2, user-event
14.6.3, jest-dom 7.0.0, MSW 2.15.0, fake-indexeddb 6.2.5, Playwright 1.62.1,
`@axe-core/playwright` 4.12.1, Lighthouse CI 0.15.1, and seeded InventoryX contract
tests

**Target Platform**: Installable responsive web application. Current and previous
major Chrome, Edge, Firefox, and Safari; current and previous Android Chrome and iOS
Safari. ES2022 build; HTTPS required for service worker and camera use.

**Project Type**: Single frontend SPA/PWA consuming a separate existing REST backend

**Performance Goals**: p75 LCP <=2.5 s, INP <=200 ms, CLS <=0.10; authenticated route
usable <=3 s; initial compressed JavaScript <=250 KiB; total initial transfer <=500
KiB; lazy route chunk <=150 KiB; cached barcode-to-cart <=200 ms p95 (automated merge
gate for SC-002; the spec's 1-second bar remains the user-facing criterion); offline durable
enqueue <=100 ms p95; recover 100 queued sales <=2 s; sale history/stock visible <=2 s
p95; report result <=3 s p95 or queue acknowledgement <=2 s

**Constraints**: WCAG 2.2 AA; no horizontal page scrolling at 320 CSS pixels; usable
at 200% zoom; keyboard-first counter flows; 44x44 CSS pixel primary mobile targets;
backend-authoritative decimal money/tax/stock; RFC 7807 errors; ETag/If-Match
concurrency; page size <=200; no user refresh token in durable browser storage; no
authenticated API payloads in service-worker Cache Storage; offline queue survives
restart, locks on sign-out, and expires at shift close or 12 hours; exact one-sale
idempotency; no third-party scripts on POS routes

**Scale/Scope**: 10 independently testable user journeys, 90 functional requirements,
18 measurable outcomes, six fixed business roles, many tenant locations/registers,
catalogues up to the backend's hundreds-of-thousands scale, paged online views, a
single-location offline snapshot, at least 100 durable queued sales, and route-level
code splitting across 13 feature areas

**Package Management**: pnpm 11.20.0 with one committed `pnpm-lock.yaml`; exact
dependency resolution is locked. Existing npm and Bun lockfiles are removed during
rewrite setup.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Gate                     | Pre-Research | Post-Design | Evidence                                                                                                                                                                   |
| ------------------------ | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test-first scope         | PASS         | PASS        | Unit, component, contract, browser integration, and E2E layers are defined in [research.md](./research.md); every task will place a failing test before its implementation |
| User-centered simplicity | PASS         | PASS        | Route/features map directly to prioritized journeys; existing incompatible architecture is removed; no speculative global state or server-rendering tier                   |
| Responsive accessibility | PASS         | PASS        | Required 320/768/1440 widths, 200% zoom, keyboard, reduced motion, axe, real screen-reader checks, and WCAG 2.2 AA are quality gates                                       |
| Technology currency      | PASS         | PASS        | Versions were checked 2026-08-09; TypeScript 6.0.3 is deliberately selected over 7.0.2 because it is the newest release compatible with the type-aware lint stack          |
| Production quality       | PASS         | PASS        | Strict typing, runtime boundary validation, CSP, scoped storage, performance budgets, OpenAPI drift checks, CI gates, and full production builds are specified             |
| Exceptions               | PASS         | PASS        | None. Backend readiness items are external prerequisites, not constitutional exceptions or client workarounds                                                              |

### Test-First Execution Evidence

Every implementation task MUST identify its focused test command and expected failing
reason before code changes. Regression work MUST reproduce the defect first. Unit and
browser retries are disabled for merge gates; quarantine requires an issue, owner, and
expiry and does not satisfy the gate. Required minimum coverage is 85% lines/functions
and 80% branches globally, and 95% lines with 90% branches for money, permissions,
idempotent mutations, and offline modules.

### Technology and Lockfile Evidence

Registry versions and compatibility decisions are recorded in [research.md](./research.md).
CI installs with a frozen pnpm lockfile, regenerates the InventoryX OpenAPI snapshot and
client, and fails on a dirty diff. Dependency upgrades require migration notes plus the
affected contract, browser, and end-to-end suites.

### Quality Commands

The implementation establishes these merge gates:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint --max-warnings=0
pnpm typecheck
pnpm test:coverage
pnpm api:check
pnpm build
pnpm test:e2e:critical
pnpm test:a11y
pnpm test:performance
```

## InventoryX Readiness Gate

The reviewed markdown contracts and implementation currently diverge on part of the
offline surface. This does not authorize frontend inference. Online stories P1-P3 and
P5-P10 may proceed; P4 may use contract fixtures and local state tests, but its
production integration and release remain blocked until the separate InventoryX
offline-readiness feature in
`../../../InventoryX/specs/002-offline-contract-readiness/` provides and tests:

1. A register-token policy restricted to the documented sync routes and the token's
   own register.
2. Historical offline price/tax acceptance so reconnect cannot silently change money
   already collected.
3. An authoritative rejected-sale review, retry, reconciliation, and audit contract.
4. One reconciled snapshot contract covering required POS metadata and deletion
   behavior, or an explicitly versioned preparation bundle that provides the same
   guarantee.

Before P4 integration begins, export the running InventoryX OpenAPI document, compare
it with the seven reviewed Cycle 1 contract files, update the committed frontend
snapshot, and pass consumer/provider contract tests. Until deletion tombstones are
provided, every shift preparation performs a full transactional replacement snapshot;
incremental watermarks are used after sync only for non-deletion updates.

## Architecture

### State Ownership

| State                                       | Owner                             | Persistence                                                                                  |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Online server records                       | TanStack Query                    | Memory only; scoped query keys                                                               |
| Shareable filters, sorting, pagination      | TanStack Router search parameters | URL                                                                                          |
| Forms and validation                        | React Hook Form + Zod             | Memory; explicit recovery draft only where required                                          |
| Transient dialogs, focus, disclosure        | Local React state                 | None                                                                                         |
| Active POS cart                             | Feature-local typed reducer/store | Memory until sale commit                                                                     |
| Offline snapshot, queue, overlays, receipts | Dexie repositories                | IndexedDB, tenant/register partition                                                         |
| App shell and static assets                 | Workbox service worker            | Cache Storage, versioned                                                                     |
| Authenticated credentials                   | Auth/session boundary             | Normal token memory only; active register credential durably wrapped only for the open shift |

### API Boundary

Generated files live under `src/shared/api/generated/` and are never manually edited.
One transport adapter maps RFC 7807 into a typed application error, applies auth and
If-Match headers, preserves decimal strings, records trace IDs, and exposes explicit
live-only metadata. Feature modules consume domain-oriented query/mutation functions,
not raw fetch.

### Offline Transaction Boundary

An offline completion transaction writes the immutable sale envelope, payload hash,
provisional receipt, and local stock overlay atomically. Effective availability equals
the server snapshot minus overlays for pending, syncing, rejected, `applied_with_conflict`, and
applied-but-not-yet-snapshotted sales. After an applied outcome, a new server snapshot
is merged atomically before its overlay retires.

Synchronization has one leader per tenant/register through Web Locks. BroadcastChannel
updates other tabs. Ambiguous network failures retry the same immutable client sale ID;
permanent rejection stops retry and locks the original for manager resolution.

### Security Boundary

Route loaders and visible affordances use the current permission/location/plan model,
but InventoryX remains the enforcement boundary. Query and decrypted state are cleared
on tenant, location, register, or identity changes. Sensitive local fields are wrapped
with non-extractable Web Crypto device key material. CSP, Trusted Types where supported,
HTTPS, dependency review, and a no-third-party-script POS policy mitigate XSS; local
encryption is not treated as protection against executing same-origin code.

## Project Structure

### Documentation (This Feature)

```text
specs/001-inventory-pos-frontend/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── api-integration.md
│   ├── navigation-access.md
│   ├── offline-sync.md
│   └── ui-state-contract.md
└── tasks.md                 # generated by /speckit-tasks
```

### Source Code (Repository Root)

```text
openapi/
└── inventoryx-v1.json      # reviewed provider snapshot

public/
├── icons/
└── manifest assets

src/
├── app/
│   ├── providers/          # router, query, auth, telemetry, error boundaries
│   ├── router.tsx
│   ├── service-worker.ts
│   └── styles.css
├── routes/                 # typed lazy route modules and route-level guards
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── catalogue/
│   ├── inventory/
│   ├── pos/
│   ├── offline-sync/
│   ├── registers/
│   ├── billing/
│   ├── purchasing/
│   ├── reports/
│   ├── notifications/
│   ├── staff/
│   └── settings/
├── shared/
│   ├── api/
│   │   ├── generated/
│   │   ├── client/
│   │   └── errors/
│   ├── auth/
│   ├── db/
│   ├── money/
│   ├── telemetry/
│   ├── test/
│   ├── ui/
│   └── utils/
├── main.tsx
└── vite-env.d.ts

tests/
├── contract/               # OpenAPI/provider and error-contract checks
├── e2e/                    # user journeys, responsive, accessibility, offline
├── fixtures/               # RFC 7807, domain, IndexedDB, and receipt fixtures
├── performance/            # bundle and user-timing budgets
└── visual/                 # targeted POS/table/dialog/receipt snapshots
```

Usability evidence is kept beside the feature artifacts:

```text
specs/001-inventory-pos-frontend/validation/
├── usability-protocol.md
├── usability-us1.md
├── usability-us2.md
└── usability-us6.md
```

Unit and component tests are colocated as `*.test.ts(x)` beside the behavior they
protect. Generated API code and build artifacts are excluded from hand-written coverage
metrics.

**Structure Decision**: Use a single feature-sliced SPA rather than separate frontend
packages. The domain is broad, but all features share one deployment, auth boundary,
design system, API, and offline register database. Feature folders provide ownership
without premature package or monorepo overhead.

## Rewrite and Migration Strategy

1. Capture a repository tag/commit reference and inventory reusable assets; do not run
   the old and new auth/API layers in the same route tree.
2. Replace package metadata, duplicate locks, build/lint/type/test configuration, root
   application entry, and design tokens. Establish all quality gates before feature
   implementation.
3. Commit the reviewed InventoryX OpenAPI snapshot, generated types, API adapter, auth
   boundary, route guards, error states, and seeded contract fixtures.
4. Establish Dexie schema, migration fixtures, service worker, offline state machine,
   sync leader, storage-pressure handling, and browser durability tests before
   **offline** POS UI (US4). Online POS (US1-US2) may proceed without the durable
   ledger.
5. Deliver vertical slices in spec priority order. Each slice includes its routes,
   states, permissions, contract tests, responsive/accessibility checks, and E2E proof.
6. Delete replaced legacy pages/services/components immediately after the equivalent
   tested slice lands. Remove Supabase, old endpoint configuration, AuthContext, and
   unused UI primitives; no compatibility facade remains at completion.
7. Validate all ten user journeys against a seeded InventoryX environment, then run
   cross-browser, real-device camera, receipt printing, screen-reader, offline recovery,
   and performance release checks.

Rollback is repository-level for the shell/tooling replacement and feature-flagged for
new operational routes. Durable database schema upgrades are forward tested with real
browser fixtures and MUST NOT activate a service-worker update mid-shift when its schema
is incompatible.

## CI and Release Gates

### Pull Requests

- Frozen install, formatting, zero-warning lint, strict typecheck, and production build.
- Unit/component coverage plus focused red-green evidence.
- OpenAPI regeneration/diff and MSW contract/error matrix.
- Chromium P1-P3 E2E at 320x800, 768x1024, and 1440x900. P4 offline E2E is skipped or
  explicitly gated until the InventoryX readiness items (tasks T101-T110) pass.
- Firefox/WebKit P1-P3 smoke, 200% zoom, keyboard flow, and zero critical/serious axe
  findings. P4 smoke follows the same InventoryX gate.
- IndexedDB/service-worker reload, sign-out lock, duplicate ID, rejection,
  `applied_with_conflict`, receipt, storage-pressure, and 12-hour authorization tests
  (required on PRs only after T101-T110 pass; otherwise nightly/release).
- Bundle, Lighthouse, and domain interaction budgets.

### Nightly and Release

- Full ten-journey Chromium/Firefox/WebKit suite and repeated flake detection.
- Seeded real InventoryX provider-contract suite.
- 100-sale offline durability/recovery stress test.
- Current/previous real iOS Safari and Android Chrome camera/PWA validation.
- NVDA with Firefox/Chrome and VoiceOver with Safari/iOS.
- Manual hardware-scanner suffix, print layout, camera permission, update, and outage
  recovery checks.
- Dependency/security scan and privacy review of telemetry fields.

## Complexity Tracking

No constitutional violations or exceptions are accepted. The full rewrite, generated
API boundary, and durable offline ledger are required by the specified behavior and
remove rather than preserve incompatible complexity. The InventoryX readiness gate is
an external dependency and blocks P4 release; it is not waived.
