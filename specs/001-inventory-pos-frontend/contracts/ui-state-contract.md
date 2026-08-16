# Contract: User Interface States and Interaction

## Required States

Every route and material subview defines and tests the applicable states below. A
spinner alone is not a complete state.

| State                 | Required Behavior                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Initial loading       | Stable reserved layout, meaningful accessible status, no stale action enabled              |
| Refreshing            | Existing safe content remains; subtle progress; no layout jump                             |
| Empty                 | Domain-specific explanation and one permitted primary action                               |
| Filtered no results   | Preserve filters and offer clear/reset; do not imply no records exist                      |
| Success               | Update canonical query/local record, announce succinctly, preserve workflow context        |
| Field validation      | Inline message linked to field plus focused/announced summary on submit                    |
| Business-rule failure | Preserve work; identify blocked action and recovery without leaking details                |
| Permission denied     | No sensitive data; explain access boundary and safe destination                            |
| Plan limit/read-only  | Preserve work; show limit/current/upgrade hint and available read-only actions             |
| Stale/conflict        | Preserve draft separately; show current server state and require explicit new submit       |
| Approval required     | Preserve pending action; identify eligible approval path/status                            |
| Offline               | Persistent unobtrusive indicator and pending count; live-only actions disabled with reason |
| Rejected sync         | Immutable manager-review state; no automatic/cashier retry                                 |
| Rate limited          | Disable repeat action until Retry-After; show retry time                                   |
| Transient failure     | Safe retry only when idempotent; show support trace ID when available                      |
| Not found             | Resource-specific state; never treated as empty list or permission proof                   |

## Forms and Mutations

- One visible primary submit action per step; duplicate submission is blocked.
- Submit remains keyboard reachable and communicates busy state without changing size.
- Inputs accept domain formats and normalize only after user intent is clear.
- Destructive, financial, stock-changing, cancellation, downgrade, purge, void, return,
  close-short, and approval actions summarize consequences before confirmation.
- Confirmation dialogs name the object/action; focus moves into the dialog and returns
  to the trigger or next logical control.
- Server field errors map to exact fields; unknown keys appear in the summary.
- Failed mutation preserves values unless retaining them would expose sensitive data.
- Successful mutation invalidates only affected scoped queries and uses the server
  response as canonical.

## POS Workspace

- Product acquisition, cart lines, totals, hold, and payment stay in one workspace.
- Hardware scan input is accepted regardless of non-editable control focus; scanner
  suffix produces one action. Active text inputs are never hijacked.
- Camera scanner opens on explicit action, requests permission then, provides a visible
  close control, and falls back to search/hardware input on denial/unavailability.
- Search/favourites/cart use stable dimensions so results, totals, errors, and status do
  not shift primary controls.
- Offline status is persistent but does not cover totals/payment controls.
- Tender amount validation and change are visible before completion.
- Final server values replace online provisional display only through a confirmed sale
  result; offline remains explicitly provisional until sync.

## Tables and Dense Operational Views

- Column headers are semantic and sortable state is announced.
- Keyboard focus never disappears during paging/filtering/virtualization.
- Financial columns are absent when not permitted.
- At narrow widths, essential identity/status/action fields remain visible; details move
  to expandable rows or a detail view rather than page-level overflow.
- Loading rows, empty rows, errors, and pagination have fixed layout regions.
- Bulk actions display selection count and clear selection after scope/filter changes.

## Notifications and Status Announcements

- Use polite live regions for routine loading/sync/success and assertive announcements
  only for blocking errors.
- Toasts do not contain the only copy of an error or required action.
- Offline pending count changes are announced without interrupting barcode input.
- Repeated notifications retain occurrence count; read state is not inferred from view.
- Trace IDs are labelled as support references and copyable.

## Responsive and Accessibility Contract

- No page-level horizontal scroll at 320 CSS pixels; content remains usable at 200%
  browser zoom.
- Test widths: 320x800, 768x1024, 1440x900 on each changed critical journey.
- Primary mobile targets are at least 44x44 CSS pixels with adequate spacing.
- All controls have accessible names, visible focus, logical order, and keyboard action.
- Color never carries status alone; text/icon shape accompanies it.
- Text and meaningful controls meet WCAG 2.2 AA contrast.
- Motion respects `prefers-reduced-motion`; no workflow requires animation.
- Dialogs, sheets, menus, comboboxes, and tabs follow their established keyboard
  patterns and restore focus.
- Charts provide accessible names, summaries, and equivalent tabular values.
- Receipts have print-specific layout that does not include application navigation.

## Update and Recovery Contract

- A new service-worker version is announced and can be deferred during a shift.
- An incompatible database update cannot activate mid-shift.
- Recoverable active cart/form work remains through session refresh; sensitive values
  such as passwords, PINs, tokens, or payment credentials do not persist.
- Storage/quota failure blocks a new offline completion before customer confirmation
  and preserves existing queue records.
- Unexpected errors render the nearest route/feature error boundary with recovery and
  safe support reference; the entire shell falls back only for shell-level failures.

## Acceptance Evidence

Each critical state requires:

1. a component/integration test using realistic MSW/problem fixtures;
2. keyboard and focus assertions;
3. axe critical/serious count of zero;
4. overflow/text-fit assertions at required widths;
5. a Playwright journey for cross-route, service-worker, storage, or browser behavior;
6. manual screen-reader validation before release for changed critical journeys.
