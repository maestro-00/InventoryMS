# OpenAPI snapshot source

This tree keeps a **committed patch-based snapshot** of the InventoryX OpenAPI
document at `openapi/inventoryx-v1.json`. It is the contract source for
`pnpm api:generate` / `pnpm api:check`. Prefer refreshing from a **live export**
when InventoryX.Presentation is available; until then, keep the patched snapshot
and re-apply only the gaps documented below.

## Live export (preferred)

Primary source when the provider is running locally:

```bash
curl -sk https://localhost:7000/swagger/v1/swagger.json -o openapi/inventoryx-v1.json
```

Captured base live export: 2026-08-14. After a fresh export, regenerate with
`pnpm api:generate` and confirm `pnpm api:check`.

## Patch-based snapshot (when live refresh is unavailable)

When a fresh localhost:7000 export is unavailable, the committed snapshot may
lag the provider. Run:

```bash
node scripts/openapi-patch-provider-gaps.mjs
pnpm api:generate
pnpm api:check
```

`openapi-patch-provider-gaps.mjs` adds provider routes missing from stale exports
(currently `PATCH /api/v1/registers/{id}`). Keep this script; it is part of the
fallback maintenance path. Retired ad-hoc `openapi-extend-us*.mjs` scripts are
not part of `api:generate` / `api:check` and must not be reintroduced into the
pipeline.

Auth session cookies (`inventoryx_refresh`, `inventoryx_session`) and
`POST /api/v1/auth/logout` are part of the SPA durability contract documented in
`SECURITY.md` and InventoryX `specs/001-inventory-pos-platform/contracts/auth-tenancy.md`.
When the live export is unavailable, those auth paths may be patched into the
snapshot from that contract so the SPA client stays aligned.

## Intentional filtering

The live Swagger document also exposes ASP.NET Identity endpoints under `/api/auth/*`
(non-v1). Those paths are **stripped** from `openapi/inventoryx-v1.json` so the
committed snapshot stays scoped to the InventoryX `/api/v1` API. After filtering,
path count is the live `/api/v1` surface only (Identity routes omitted).

No other paths are removed or rewritten from the live document. Prior manual US1–US9
extensions are superseded by the live export when those operations are present on
the running provider.

If live export is unavailable, fall back to reconstructing from:

- `../InventoryX/specs/001-inventory-pos-platform/contracts/`
- `../InventoryX/tests/InventoryX.Presentation.Tests/Swagger/ContractSurfaceTests.cs`
- `../InventoryX/InventoryX.Presentation/Swagger/LiveOnlyOperationFilter.cs`

Regenerate types with `pnpm api:generate`. Drift is a merge blocker via
`pnpm api:check`.
