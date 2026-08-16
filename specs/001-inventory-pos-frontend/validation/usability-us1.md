# US1 usability validation: sign-up through first sale (T063)

Recorded: 2026-08-13
Feature: `001-inventory-pos-frontend`
Method: [`usability-protocol.md`](./usability-protocol.md), substitute-walkthrough clause
Functional evidence: [`us1-first-sale.md`](./us1-first-sale.md)

## Status: NOT usability evidence

**No human participants took part in this run.** Representative small-business owners
were not available to this workstation, so what follows is the structured self-run
walkthrough that the protocol permits as a stand-in: the same tasks, the same success
conditions, walked by the implementer against the mocked build. It is a design review.

Consequently this record contains **no participant counts, no success percentages, no
task times, and no confidence scores**, because none were measured on real users.
Presenting any such number here would be fabrication. The protocol's exit criteria
(80% unassisted success, median confidence, time budgets) **cannot be evaluated** and are
recorded as _not assessed_.

**The full 5-participant protocol must be re-run before release**, against a live
InventoryX instance, and this file replaced with its results.

## Walkthrough environment

| Item             | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Build            | Local `pnpm dev` with `VITE_API_MOCKING=true`                          |
| Backend          | Mock Service Worker (`src/shared/test/msw/us1-scenario.ts`) — not live |
| Viewports walked | 320 x 640, 768 x 1024, 1440 x 900                                      |
| Input modes      | Pointer, and keyboard-only                                             |
| Participants     | None                                                                   |

## Tasks walked

Tasks are phrased as business outcomes per the protocol. "Reached" means the walkthrough
satisfied the success condition; it says nothing about whether an unfamiliar owner would.

| #   | Task (as it would be read to a participant)                            | Success condition                                       | Reached |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------- |
| 1   | "Set up an account for your business so you can start selling."        | Tenant exists; owner is signed in                       | Yes     |
| 2   | "Find out how long you can use this before paying."                    | Trial length and plan are read from the screen          | Yes     |
| 3   | "Tell the system where you sell from."                                 | Location `Main Shop` persisted                          | Yes     |
| 4   | "Group your goods so they are easier to find later."                   | Category persisted; a category can be moved and retired | Yes     |
| 5   | "Add a bag of sugar you sell for 10 cedis and buy for 6."              | Product `SUG-001` persisted with its tax treatment      | Yes     |
| 6   | "Record what you have on the shelf so the till knows."                 | Opening stock 10 recorded at the location               | Yes     |
| 7   | "Open the till for today's trading with the cash you counted."         | Shift open with a 100.00 float                          | Yes     |
| 8   | "Sell two bags of sugar for cash and give the customer their receipt." | One sale completed; receipt final; change shown         | Yes     |
| 9   | "Check what you have left and what you have sold today."               | Stock reads 8; sale appears once in history             | Yes     |
| 10  | "Put your business details and return policy on the receipt."          | Receipt template saved and previewed                    | Yes     |

## Observations from the walkthrough

Ordered by the severity the protocol defines. Severity is the walker's judgement, not a
participant-observed rating.

| Severity | Observation                                                                                                                                                                                                              | Follow-up                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 3        | The till cannot be used until a location and a register exist, and the empty till only explains the location half of that prerequisite in prose. An owner who lands on the till first is likely to bounce between pages. | Candidate for the US2 workspace pass (T077); needs participant confirmation before design changes. |
| 3        | "Opening stock" is the product's own vocabulary. Task 6 was phrased as shelf counting precisely because the label is unlikely to be a business owner's first guess for that job.                                         | Wording candidate; must be tested with participants rather than renamed on this observation alone. |
| 2        | Money and quantity fields accept a decimal string and only report a problem after submission, since the server owns validation. The wait is short but the field gives no earlier signal.                                 | Acceptable under the backend-authoritative rule; revisit if participants hesitate.                 |
| 2        | The onboarding checklist marks the first sale complete only after the sale returns, so the step appears unchanged during the request.                                                                                    | Cosmetic under mocked latency; re-check on real network latency.                                   |
| 1        | Navigation labels use feature names ("Point of sale", "Catalogue") rather than task names ("Sell", "My goods").                                                                                                          | Wording candidate for the same participant round.                                                  |

Nothing severity-4 was observed: every task in the journey was completable in the walked
build at all three viewports, with a pointer and with the keyboard alone.

## Accessibility cross-check

The keyboard-only and zoom behaviour relevant to this journey is measured, not judged, in
`tests/e2e/us1-first-sale.accessibility.spec.ts`: axe reports no critical or serious
violations at 320, 768, and 1440 px; the till's controls are reachable with visible focus
using the keyboard alone; and the layout reflows at 640 CSS px (1280 at 200% zoom) without
horizontal scrolling. Those results are recorded in
[`us1-first-sale.md`](./us1-first-sale.md).

## Exit criteria

| Criterion                                   | Result                             |
| ------------------------------------------- | ---------------------------------- |
| 80% unassisted success per task             | Not assessed — no participants     |
| No open severity-4 finding                  | None observed in the walkthrough   |
| Every severity-3 finding owned              | Two recorded above with follow-ups |
| Median time on task within budget           | Not assessed — no participants     |
| Median confidence >= 4 on money/stock tasks | Not assessed — no participants     |

US1 usability validation is therefore **incomplete**, and this is a known release
blocker for usability claims specifically. The functional and accessibility gates for US1
are green and recorded separately.
