# Quickstart complete — consolidated evidence index

Recorded: 2026-08-14  
Feature: `001-inventory-pos-frontend`  
Source scenarios: [`../quickstart.md`](../quickstart.md)

## Environment caveat

| Item                                              | Value                                                         |
| ------------------------------------------------- | ------------------------------------------------------------- |
| InventoryX instance                               | Live at `http://localhost:5291` for US4 Scenario D            |
| Network under test                                | MSW for mocked journeys; live InventoryX for US4 provider E2E |
| Browsers assessed here                            | Chromium (Playwright) unless a linked doc says otherwise      |
| Live provider gates (US4 T116–T118 / T128 / T133) | **PASS** — see [`us4-offline.md`](./us4-offline.md)           |

Mocked-versus-live caveat: most scenarios remain MSW-proven. Scenario D also has
live InventoryX evidence recorded in [`us4-offline.md`](./us4-offline.md).

## Scenario index

| Scenario | Title                                      | Primary evidence                                                                                                 | Result                                                      |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A        | Onboard through first sale                 | [`us1-first-sale.md`](./us1-first-sale.md), `tests/e2e/us1-first-sale.spec.ts`                                   | Pass (MSW / Chromium)                                       |
| B        | Import with preview                        | Covered under US1 catalogue import paths in `us1-first-sale.md` / catalogue feature tests                        | Pass (fixture); live CSV against InventoryX not re-run here |
| C        | Counter sale, hold, split tender, return   | [`us2-counter-sale.md`](./us2-counter-sale.md), `tests/e2e/us2-counter-sale.spec.ts`                             | Pass (MSW / Chromium)                                       |
| D        | Offline durability and recovery            | [`us4-offline.md`](./us4-offline.md), `pnpm test:e2e:offline`, `pnpm test:e2e:live`                              | **Pass** — MSW browser/quality + live Scenario D / 100-sale |
| E        | Stock, counts, transfers, purchasing       | [`us3-stock-control.md`](./us3-stock-control.md), [`us7-purchasing.md`](./us7-purchasing.md)                     | Pass (MSW / Chromium subsets)                               |
| F        | Plans, permissions, reports, notifications | [`us5-billing.md`](./us5-billing.md), [`us8-reporting.md`](./us8-reporting.md), [`us9-staff.md`](./us9-staff.md) | Pass (MSW / Chromium subsets)                               |

Supporting story records: [`us6-register-shift.md`](./us6-register-shift.md), [`us10-batches.md`](./us10-batches.md).

## Cross-cutting evidence

| Gate                                | Document                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Foundation / tooling                | [`foundation.md`](./foundation.md)                                                                              |
| Cross-browser                       | [`cross-browser.md`](./cross-browser.md) — Chromium executed; Firefox/WebKit not assessed                       |
| Responsive 320/768/1440 + 200% zoom | [`responsive.md`](./responsive.md)                                                                              |
| Accessibility                       | [`accessibility.md`](./accessibility.md) — axe/keyboard recorded; NVDA/VoiceOver not run                        |
| Devices                             | [`devices.md`](./devices.md) — physical devices not assessed                                                    |
| Security audit                      | [`security-audit.md`](./security-audit.md)                                                                      |
| Performance                         | [`performance.md`](./performance.md)                                                                            |
| Final quality commands              | [`final-quality-gates.md`](./final-quality-gates.md)                                                            |
| Traceability                        | [`traceability.md`](./traceability.md)                                                                          |
| Release decision                    | [`release-readiness.md`](./release-readiness.md) — US4 offline gates cleared; other release blockers may remain |

## Commands used for this index

```bash
pnpm test
pnpm test:e2e:offline
pnpm test:e2e:live
pnpm vitest run tests/legacy-boundary.test.ts tests/contract/security-headers.test.ts tests/performance
pnpm test:responsive   # Chromium
# Optional: pnpm test:visual --update-snapshots (Chromium baselines)
# Optional after build: pnpm check:bundle && pnpm test:performance
```

US4 Scenario D live verification is recorded. Remaining overall release work is
outside the US4 task list (lint/coverage/cross-browser/devices).
