# US8 Reporting validation

**Date**: 2026-08-13  
**Mode**: MSW fixture + Chromium Playwright (`VITE_API_MOCKING=true`)  
**Quickstart**: Scenario F (dashboard → reports → export/schedule → notifications)

## Evidence

| Check                                            | Result | Notes                                               |
| ------------------------------------------------ | ------ | --------------------------------------------------- |
| Contract (OpenAPI from InventoryX controllers)   | Pass   | `tests/contract/us8-reporting.contract.test.ts`     |
| Dashboard / report table / profit gate component | Pass   | `src/features/reports/reporting.test.tsx`           |
| Export poll + schedule create/deactivate         | Pass   | same file                                           |
| Notification feed + preferences                  | Pass   | `src/features/notifications/notifications.test.tsx` |
| Critical E2E journey                             | Pass   | `tests/e2e/us8-reporting.spec.ts` (@critical)       |
| Responsive axe 320/768/1440                      | Pass   | `us8-reporting-quality.spec.ts`                     |
| Chart table fallback                             | Pass   | accessible chart equivalent table present           |
| Keyboard + 200% zoom filters                     | Pass   | Report/From focus path                              |

## Journey notes

1. Dashboard shows comparison metrics, warnings, top sellers, profit (Owner).
2. Sales today detail link opens `/reports?kind=sales` with retained filters.
3. Export starts async job, polls to Ready.
4. Daily sales schedule created Active.
5. Notifications feed marks all read; preferences save (Push flag persisted).

## Honest gaps

- Live InventoryX not exercised in this pass.
- Firefox / WebKit / NVDA / VoiceOver / devices: **not assessed**.
- Usability percentages: **not fabricated**.
