# Cross-browser validation

**Date**: 2026-08-14 (T238 closed)

| Browser  | Result                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| Chromium | Pass (prior sessions + this feature’s story suites)                                   |
| Firefox  | **Pass** — ten-story suite green without `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS` |
| WebKit   | **Pass** — ten-story suite green after host `libavif16` install                       |

## Runtime

- Playwright `@playwright/test` **1.62.1**
- Engines: Playwright Firefox **v1538**, WebKit **v2336**, Chromium **1234**
- `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright`
- App under test: `VITE_API_MOCKING=true VITE_E2E_OFFLINE_BRIDGE=true` via `playwright.config.ts` webServer

## Ten-story command (T238)

```bash
export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
CI=1 pnpm exec playwright test \
  tests/e2e/us1-first-sale.spec.ts \
  tests/e2e/us2-counter-sale.spec.ts \
  tests/e2e/us3-stock-control.spec.ts \
  tests/e2e/us4-offline-browser.spec.ts \
  tests/e2e/us5-billing.spec.ts \
  tests/e2e/us6-register-shift.spec.ts \
  tests/e2e/us7-purchasing.spec.ts \
  tests/e2e/us8-reporting.spec.ts \
  tests/e2e/us9-staff.spec.ts \
  tests/e2e/us10-batch-trace.spec.ts \
  --project=firefox --project=webkit --workers=2
```

**Result**: `27 passed`, `1 skipped`, `0 failed` (~2.3m).

### Skip note (honest residual)

- Firefox skips `pending sales are visible from a second document` — Playwright on Firefox destroys the second-page execution context while reading shared IndexedDB. Durability on Firefox is still covered by `IndexedDB queue survives reload` and `100-sale recovery after reload`.
- WebKit runs the second-document check and passes.

## Stability fixes landed with T238

- Scoped query `permissionRevision` uses role+permissions (not token `expiresAt`) so refresh no longer remounts opening-stock / register forms.
- POS / opening-stock loading gates use `isLoading` and keep success UI mounted.
- Stable submit button accessible names; US1/US2 e2e helpers assert field values and use resilient clicks.
- US4 reload lands on `/login` after memory-session loss; Firefox reload abort is tolerated.
- App shell mounts `SheetContent` only while the nav sheet is open (avoids overlay pointer interception).
