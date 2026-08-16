# Requirement-to-test traceability (T230)

Recorded: 2026-08-14  
Sources: [`../spec.md`](../spec.md), story validation docs under this folder, automated suites in `tests/` and `src/**/*.test.*`.

## P4 provider status

| Item                                                   | Status                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Local offline modules / Dexie / MSW contracts          | Implemented (see [`us4-offline.md`](./us4-offline.md))                                   |
| InventoryX readiness T101–T110                         | Complete (unit + live Scenario D on `http://localhost:5291`)                             |
| Live apply-sync / 100-sale E2E (T116–T118, T128, T133) | **PASS** — `pnpm test:e2e:live` + `pnpm test:e2e:offline` (2026-08-14)                   |
| P4 release claim                                       | Allowed for US4 offline gates; other release blockers may remain (lint/coverage/devices) |

## UX requirements

| ID     | Evidence                                                              | Status                                            |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------- |
| UX-001 | `src/shared/ui/states/ui-state.test.tsx`, story empty/loading paths   | Covered (fixture)                                 |
| UX-002 | US1–US3/US6/US7 E2E + usability protocol docs                         | Covered (Chromium); real-user % not measured      |
| UX-003 | `tests/e2e/*accessibility*`, [`accessibility.md`](./accessibility.md) | Keyboard/axe recorded; NVDA/VoiceOver not run     |
| UX-004 | [`responsive.md`](./responsive.md) 200% zoom                          | Chromium only                                     |
| UX-005 | US2 POS quality / cart tests                                          | Covered (fixture)                                 |
| UX-006 | Alert-dialog primitives + destructive flows in stock/POS/billing      | Covered (fixture)                                 |
| UX-007 | Offline status UI + US4 local/live tests                              | Covered — `us4-offline-quality` + live Scenario D |
| UX-008 | Subscription gate + staff permissions tests                           | Covered (fixture)                                 |

## Functional requirements (FR-001 … FR-090)

| Range      | Theme                                                                 | Primary tests / docs                                                                     | Status                       |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| FR-001–011 | Auth, onboarding, staff invite, audit                                 | [`us1-first-sale.md`](./us1-first-sale.md), [`us9-staff.md`](./us9-staff.md)             | Pass MSW                     |
| FR-012–026 | POS acquisition, tender, returns, receipts                            | [`us2-counter-sale.md`](./us2-counter-sale.md)                                           | Pass MSW                     |
| FR-027–039 | Stock, transfers, counts, batches, alerts                             | [`us3-stock-control.md`](./us3-stock-control.md), [`us10-batches.md`](./us10-batches.md) | Pass MSW                     |
| FR-040–046 | Offline snapshot, queue, conflicts                                    | [`us4-offline.md`](./us4-offline.md)                                                     | Local pass; **live blocked** |
| FR-047–055 | Plans, billing, export                                                | [`us5-billing.md`](./us5-billing.md)                                                     | Pass MSW                     |
| FR-056–060 | Registers and shifts                                                  | [`us6-register-shift.md`](./us6-register-shift.md)                                       | Pass MSW                     |
| FR-061–069 | Purchasing                                                            | [`us7-purchasing.md`](./us7-purchasing.md)                                               | Pass MSW                     |
| FR-070–078 | Dashboard, reports, notifications, profit visibility                  | [`us8-reporting.md`](./us8-reporting.md)                                                 | Pass MSW                     |
| FR-079–090 | Permissions, paging, errors, money precision, idempotency, categories | Contract + shared auth/money tests; US1 categories                                       | Pass MSW                     |

## Success criteria (SC-001 … SC-018)

| ID         | Evidence                                 | Honest status                                                                            |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| SC-001     | Usability US1 docs                       | Protocol exists; **no fabricated completion %** — representative-user study not run here |
| SC-002     | POS barcode unit/E2E                     | Automation pass; field 95% not measured                                                  |
| SC-003     | Usability US2                            | Protocol/partial; no fabricated %                                                        |
| SC-004     | US1/US2 sale history assertions          | Pass under MSW timing                                                                    |
| SC-005     | US4 100-sale durability                  | **Blocked** on live InventoryX                                                           |
| SC-006     | Problem/limit contract tests             | Pass MSW                                                                                 |
| SC-007     | [`responsive.md`](./responsive.md)       | Chromium pass                                                                            |
| SC-008     | [`accessibility.md`](./accessibility.md) | Keyboard/axe partial; SR tools not run                                                   |
| SC-009     | Usability US6                            | Protocol/partial; no fabricated %                                                        |
| SC-010     | Reporting E2E                            | Functional pass; 95%@3s field sample not collected                                       |
| SC-011     | Access-policy / session tests            | Pass unit                                                                                |
| SC-012     | Idempotent sale / offline identity tests | Pass fixture                                                                             |
| SC-013     | Permission-gated navigation tests        | Pass fixture                                                                             |
| SC-014     | [`performance.md`](./performance.md)     | Budget automation present; field p75 not collected                                       |
| SC-015     | Offline provisional receipt tests        | Pass fixture                                                                             |
| SC-016–018 | Offline readiness / reject / auth end    | Local unit + live Scenario D (`us4-offline.md`)                                          |

## How to refresh

1. Re-run story E2E against a seeded InventoryX when available.
2. Update the matching `validation/us*.md` file first, then adjust this matrix.
3. Never mark P4 live rows pass without T116–T118 / T128 / T133 evidence.
