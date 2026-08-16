# Release readiness

**Date**: 2026-08-14 (Phase 14 loop — T238/T242 closed)

**Decision: READY for release** (frontend merge gates + ten-story cross-browser evidence)

## Cleared this loop

- **T238** — Firefox + WebKit ten-story suite: `27 passed`, `1 skipped` (Firefox second-document IDB only), `0 failed`. Evidence: [`cross-browser.md`](./cross-browser.md). Host `libavif16` installed; engines launch without `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS`.
- **T242** — Remaining convergence blockers closed; `pnpm lint --max-warnings=0` reconfirmed Pass.

## Prior cleared (Phase 14)

- T232–T237, T239–T241 (offline POS wiring, lint, tenders, connectivity, live-only gating, CWV LCP, a11y/device notes, FR-079 exception)

## Residual risks (non-blocking)

- Firefox skips multi-document IDB read under Playwright; reload + 100-sale recovery still pass on Firefox. WebKit covers the second-document check.
- Occasional Vite `Importing a module script failed` console noise under parallel WebKit workers; did not fail assertions in the recorded run.
- Live InventoryX provider gates remain a separate deploy concern (MSW journey evidence is the frontend gate).

Rollback: revert frontend deploy.
