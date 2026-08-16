# OpenAPI snapshot source

Captured: 2026-08-14

Primary source: **live export** from `https://localhost:7000/swagger/v1/swagger.json`
(InventoryX.Presentation running locally). This snapshot is the provider contract
surface used for frontend client generation and `pnpm api:check` drift detection.

Auth session cookies (`inventoryx_refresh`, `inventoryx_session`) and
`POST /api/v1/auth/logout` are part of the SPA durability contract documented in
`SECURITY.md` and InventoryX `specs/001-inventory-pos-platform/contracts/auth-tenancy.md`.
When the live export is unavailable, those auth paths may be patched into the snapshot
from that contract so the SPA client stays aligned.

```bash
curl -sk https://localhost:7000/swagger/v1/swagger.json -o openapi/inventoryx-v1.json
```

## Intentional filtering

The live Swagger document also exposes ASP.NET Identity endpoints under `/api/auth/*`
(non-v1). Those paths are **stripped** from `openapi/inventoryx-v1.json` so the
committed snapshot stays scoped to the InventoryX `/api/v1` API. After filtering,
path count is the live `/api/v1` surface only (Identity routes omitted).

No other paths are removed or rewritten from the live document. Prior manual US1–US9
extensions in this file are superseded by the live export when those operations are
present on the running provider.

If live export is unavailable, fall back to reconstructing from:

- `../InventoryX/specs/001-inventory-pos-platform/contracts/`
- `../InventoryX/tests/InventoryX.Presentation.Tests/Swagger/ContractSurfaceTests.cs`
- `../InventoryX/InventoryX.Presentation/Swagger/LiveOnlyOperationFilter.cs`

Regenerate types with `pnpm api:generate`. Drift is a merge blocker via
`pnpm api:check`.
