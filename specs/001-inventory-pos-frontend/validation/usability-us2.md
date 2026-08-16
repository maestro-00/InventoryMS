# US2 usability validation: primary counter sale (T083)

Recorded: 2026-08-13
Feature: `001-inventory-pos-frontend`
Method: [`usability-protocol.md`](./usability-protocol.md), substitute-walkthrough clause
Functional evidence: [`us2-counter-sale.md`](./us2-counter-sale.md)

## Status: NOT usability evidence

**No human participants took part in this run.** Representative cashiers were not
available to this workstation, so what follows is the structured self-run walkthrough
that the protocol permits as a stand-in: the same tasks, the same success conditions,
walked by the implementer against the mocked build. It is a design review.

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
| Viewports walked | 320 x 800, 768 x 1024, 1440 x 900                                      |
| Input modes      | Pointer, keyboard-wedge burst, camera-denied typed fallback            |
| Participants     | None                                                                   |

## Tasks walked

Tasks are phrased as business outcomes per the protocol. "Reached" means the walkthrough
satisfied the success condition; it says nothing about whether an unfamiliar cashier
would.

| #   | Task (as it would be read to a participant)                                              | Success condition                                               | Reached |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------- |
| 1   | "The customer is holding a bag of sugar. Get it onto this sale without typing the name." | Line for `Sugar 1kg` appears after one barcode burst            | Yes     |
| 2   | "They also want rice but you are not sure of the spelling."                              | `Rice 5kg` added from the search combobox                       | Yes     |
| 3   | "Cooking oil is a regular. Use the buttons you set up for this till."                    | `Cooking oil 1L` added from favourites                          | Yes     |
| 4   | "This customer needs a minute. Park the sale and serve the next person."                 | Held list shows the parked cart; the live cart is empty         | Yes     |
| 5   | "Take cash for a simple sugar sale, then go back to the parked customer."                | One completed cash sale; held sale recalled into the cart       | Yes     |
| 6   | "They are paying part cash and part card."                                               | Cash and Card tenders submitted together; receipt is final      | Yes     |
| 7   | "Email the receipt to the customer."                                                     | Delivery result shown without changing the sale                 | Yes     |
| 8   | "The earlier sugar customer brought one bag back. Put it on the shelf."                  | Receipt found; one line returned; refund amount from the server | Yes     |

## Observations from the walkthrough

Ordered by the severity the protocol defines. Severity is the walker's judgement, not a
participant-observed rating.

| Severity | Observation                                                                                                                                                                                                     | Follow-up                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 3        | After a sale completes, the till switches to the receipt panel. Returns live on a tab that is not on that panel, so a cashier who just took payment cannot start a return until they choose "Start a new sale". | Candidate for keeping after-sale actions reachable from the receipt; needs participant confirmation. |
| 3        | The workspace has both "Take cash payment" and "Take split payment". A cashier who only ever takes cash can ignore the split panel, but the two verbs compete on the same screen.                               | Layout candidate; do not collapse them without watching a real till run.                             |
| 2        | Unknown barcodes open a create-product path that requires `ManagePricing`. A Sell-only cashier sees a manager prompt instead. That is correct policy, but the wording is easy to miss under queue pressure.     | Copy candidate for the participant round.                                                            |
| 2        | Favourites with an empty saved layout fall back to every catalogue product, which is helpful on first use and noisy once the catalogue grows.                                                                   | Empty-layout behaviour should be confirmed with cashiers who have large catalogues.                  |
| 1        | "Hardware scanner ready" is screen-reader-only. A cashier looking for a scan status will not see it.                                                                                                            | Acceptable if wedge use is assumed; confirm with participants who also use the camera.               |

Nothing severity-4 was observed: every task in the journey was completable in the walked
build at the three viewports above.

## Accessibility cross-check

POS axe, camera-denial focus, and barcode-to-cart timing are measured in
`tests/e2e/us2-pos-quality.spec.ts`. US1 keyboard-only and zoom behaviour remains in
`tests/e2e/us1-first-sale.accessibility.spec.ts`. Those results are recorded in
[`us2-counter-sale.md`](./us2-counter-sale.md).

## Exit criteria

| Criterion                                   | Result                             |
| ------------------------------------------- | ---------------------------------- |
| 80% unassisted success per task             | Not assessed — no participants     |
| No open severity-4 finding                  | None observed in the walkthrough   |
| Every severity-3 finding owned              | Two recorded above with follow-ups |
| Median time on task within budget           | Not assessed — no participants     |
| Median confidence >= 4 on money/stock tasks | Not assessed — no participants     |

US2 usability validation is therefore **incomplete**, and this is a known release
blocker for usability claims specifically. The functional and accessibility gates for US2
are green and recorded separately.
