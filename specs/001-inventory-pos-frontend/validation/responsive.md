# Responsive validation (T222)

Recorded: 2026-08-13  
Feature: `001-inventory-pos-frontend`  
Automation: `tests/e2e/responsive-overflow.spec.ts` (`@responsive`)

## Caveat

| Item             | Value                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser          | **Chromium only** (Playwright project `chromium`)                                                                                             |
| Firefox / WebKit | Not executed in this pass — engines not required for this evidence file; full matrix remains open in [`cross-browser.md`](./cross-browser.md) |
| InventoryX       | MSW mock provider (`VITE_API_MOCKING=true`)                                                                                                   |
| Physical devices | Not assessed (see [`devices.md`](./devices.md))                                                                                               |

## Viewports and zoom

| Condition                                                | Routes checked                                                                   | Horizontal overflow            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| 320×800                                                  | login + in-app: catalogue, POS, inventory, reports, dashboard (mobile sheet nav) | **Pass** (Chromium 2026-08-13) |
| 768×1024                                                 | same via Primary nav                                                             | **Pass**                       |
| 1440×900                                                 | same via Primary nav                                                             | **Pass**                       |
| 200% zoom (`documentElement.style.zoom = 2`) on 1440×900 | catalogue, POS, inventory                                                        | **Pass**                       |

Command result: `pnpm exec playwright test --grep @responsive --project=chromium` → **4 passed**.

## How to reproduce

```bash
pnpm test:responsive
# equivalent:
pnpm exec playwright test --grep @responsive --project=chromium
```

## Honesty notes

- Overflow is measured at the document level. Individual dense tables may scroll
  inside their region; that is allowed so long as the page itself does not force
  horizontal scrolling.
- Zoom uses CSS `zoom` in Chromium; it approximates browser 200% zoom for layout
  regression but is not identical to Firefox full-page zoom.
- Failures should be filed against the offending route shell before release.
