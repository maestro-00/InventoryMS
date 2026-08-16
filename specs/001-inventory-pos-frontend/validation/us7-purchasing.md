# US7 Purchasing validation

**Date**: 2026-08-13  
**Mode**: MSW fixture + Chromium Playwright (`VITE_API_MOCKING=true`)  
**Quickstart**: Scenario E (replenishment → receipt → cost)

## Evidence

| Check                                                                | Result | Notes                                                                                                                       |
| -------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Contract surface (OpenAPI from InventoryX controllers)               | Pass   | `tests/contract/us7-purchasing.contract.test.ts` — suppliers, reorder apply, PO lifecycle, receipts, invoices, landed costs |
| PO transition / ETag / approval / close-short unit                   | Pass   | `purchase-order-state.test.ts`                                                                                              |
| Component (supplier, order, receipt, invoice, landed, reorder apply) | Pass   | `src/features/purchasing/purchasing.test.tsx`                                                                               |
| Critical E2E replenishment journey                                   | Pass   | `tests/e2e/us7-purchasing.spec.ts` (@critical) — Chromium                                                                   |
| Responsive 320 / 768 / 1440 axe                                      | Pass   | `us7-purchasing-quality.spec.ts` — no critical/serious axe violations                                                       |
| Dense table/form reflow (320)                                        | Pass   | no page-level horizontal scroll                                                                                             |
| Keyboard reach supplier + filter                                     | Pass   | focus moves without trap                                                                                                    |
| Close-short confirmation                                             | Pass   | dismiss keeps status Sent                                                                                                   |

## Journey notes (Scenario E)

1. Owner signs in; location Main Shop + product Sugar 1kg seeded.
2. Purchasing: Accra Foods created; Tema Wholesale from MSW seed used for draft PO.
3. Draft → Submit → Sent (total ≤ 5000 skips AwaitingApproval in MSW).
4. Partial goods receipt with batch + expiry → PartiallyReceived.
5. Close-short with reason + confirm → Closed.
6. Supplier invoice with unit price variance → price difference flagged.
7. Landed freight allocation → true cost displayed from InventoryX-shaped response.

## Honest gaps

- Live InventoryX apply (non-MSW) not run in this pass.
- Firefox / WebKit / NVDA / VoiceOver / physical devices: **not assessed**.
- Usability percentages: **not fabricated** — qualitative axe + keyboard only.
