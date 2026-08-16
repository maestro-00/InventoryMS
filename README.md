# InventoryMS

Typed InventoryX Cycle 1 inventory and point-of-sale frontend (React 19, TypeScript 6,
Vite 8, TanStack Router/Query, Dexie offline partition, OpenAPI-first client).

## Stack

| Layer           | Choice                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| UI              | React 19 + Tailwind CSS 4 + audited Radix primitives in `src/shared/ui` |
| Routing         | TanStack Router (`src/routes`, generated `routeTree.gen.ts`)            |
| Data            | TanStack Query + `openapi-fetch` against `openapi/inventoryx-v1.json`   |
| Offline         | Dexie register partition + service worker (`src/app/service-worker.ts`) |
| Tests           | Vitest, Playwright, axe, Lighthouse CI, bundle budget script            |
| Package manager | **pnpm 11.20.0 only** (Corepack)                                        |

## Prerequisites

- Node.js 24+
- Corepack + pnpm 11.20.0
- Optional: local InventoryX with CORS for the Vite origin (HTTPS outside localhost for camera/SW)

## Setup

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
```

```env
VITE_INVENTORYX_ORIGIN=https://localhost:7000
VITE_API_MOCKING=true
VITE_TELEMETRY_ENABLED=false
```

`VITE_API_MOCKING=true` boots MSW for local journeys without InventoryX.

```bash
pnpm dev
```

## Architecture (short)

- `src/app` — providers, shell, styles, service worker
- `src/features` — auth, catalogue, inventory, POS, offline-sync, billing, reports, staff
- `src/shared` — API client, auth/session, Dexie, telemetry, UI primitives
- `src/routes` — file-based TanStack routes
- Specs live under `specs/001-inventory-pos-frontend/`

See [`docs/architecture.md`](./docs/architecture.md) for boundaries and offline limits.

## Testing and validation

```bash
pnpm format:check
pnpm lint --max-warnings=0
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm api:check
pnpm build
pnpm check:bundle
pnpm test:e2e:critical          # Playwright
pnpm test:responsive            # 320/768/1440 + 200% zoom (Chromium)
pnpm test:visual                # POS/table/dialog/receipt screenshots
pnpm test:performance           # build + bundle budget + Lighthouse CI
```

Evidence index: [`specs/001-inventory-pos-frontend/validation/quickstart-complete.md`](./specs/001-inventory-pos-frontend/validation/quickstart-complete.md).

## Offline limitations

- Offline selling requires a prepared register snapshot and an open shift.
- Live InventoryX offline apply-sync / rejected-sale reconciliation is a **P4 provider gate**; fixture/MSW coverage does not equal production readiness.
- Access tokens are memory-only; a full document reload signs the user out.
- Mid-shift service-worker updates are deferred while a shift is open or offline sales are pending.

## Browser support

Primary target: current Chromium. Playwright projects also define Firefox and WebKit;
those engines are not always installed in CI agents — see
[`specs/001-inventory-pos-frontend/validation/cross-browser.md`](./specs/001-inventory-pos-frontend/validation/cross-browser.md).

## Security headers

Deploy `public/_headers` (CSP, Trusted Types, `camera=(self)`). Details in `SECURITY.md`
and `docs/telemetry.md`.

## Backend

[InventoryX](https://github.com/maestro-00/InventoryX) owns money, stock, and
authorization. Regenerate the OpenAPI snapshot only from a running instance:

```bash
curl --fail "$VITE_INVENTORYX_ORIGIN/swagger/v1/swagger.json" -o openapi/inventoryx-v1.json
pnpm api:generate && pnpm api:check
```

## License

MIT — see `LICENSE.md`.
