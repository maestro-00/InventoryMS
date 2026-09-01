# Contract: Navigation and Access

## Guard Order

Every protected route resolves gates in this order before loading sensitive data:

1. Valid user session.
2. Tenant and subscription availability (viewing/export/billing remain in read-only).
3. Required permission atoms.
4. Assigned location scope.
5. Required register and open-shift context.
6. Required plan feature/limit.
7. Required online/offline capability.

Visible navigation is an affordance, not authorization. InventoryX denial is final and
is handled through the UI-state contract. Guard evaluation MUST NOT fetch forbidden
record data before deciding access from current session metadata.

## Route Surface

Paths are canonical route identifiers; final human-readable labels remain domain terms.

| Route                                                                           | Primary Actors                           | Gate                                          | Offline Behavior                                                                                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/features`, `/pricing`, `/login`, `/register`, `/invite/accept`, `/plans` | Public                                   | Public contract                               | App shell only; mutations online                                                                                                                   |
| `/onboarding`                                                                   | Owner/Admin                              | Auth + tenant write                           | Online only                                                                                                                                        |
| `/dashboard`                                                                    | Owner/Admin/Manager/Accountant           | ViewReports; ViewProfit shapes fields         | Cached shell only; data live                                                                                                                       |
| `/pos`                                                                          | Cashier/Manager                          | Sell + location + register + open shift       | Full prepared-shift sale workflow                                                                                                                  |
| `/pos/held`, `/sales`, `/sales/:id`                                             | Sell/ViewReports                         | Own/all visibility from server                | Held/history live; local pending panel offline                                                                                                     |
| `/returns`                                                                      | Sell                                     | Return/refund approval policy                 | Live only                                                                                                                                          |
| `/registers`, `/registers/:id/favourites`                                       | Owner/Admin/Manager/Cashier read         | Manage register or Sell                       | Favourites snapshot used in POS                                                                                                                    |
| `/shifts/:id`, `/shifts/:id/z-report`                                           | Cashier/ViewReports                      | Own or report permission                      | Existing open shift context visible offline; close live                                                                                            |
| `/catalogue/products`, `/catalogue/products/:id`                                | Authenticated                            | Read; ManageStock/Pricing for writes          | Prepared catalogue read/search in POS only                                                                                                         |
| `/catalogue/categories`                                                         | ManageStock                              | Plan + online                                 | Online only                                                                                                                                        |
| `/catalogue/import`                                                             | ManageStock                              | Plan + online upload                          | Online only                                                                                                                                        |
| `/inventory/stock`, `/inventory/movements`                                      | ManageStock or limited Sell availability | Cost fields require ViewProfit                | Online except prepared POS availability                                                                                                            |
| `/inventory/transfers`, `/inventory/counts`, `/inventory/adjustments`           | ManageStock/Approver                     | Permission + location                         | Online only in Cycle 1 web client                                                                                                                  |
| `/inventory/batches/:id`                                                        | ManageStock                              | Location/permission                           | Online only                                                                                                                                        |
| `/purchasing/suppliers`, `/purchasing/orders`, `/purchasing/receipts`           | ManagePurchasing/ManageStock/Approver    | Plan feature + permission                     | Online only                                                                                                                                        |
| `/reports/:type`, `/reports/schedules`, `/exports`                              | ViewReports                              | ViewProfit where required                     | Online only                                                                                                                                        |
| `/billing`, `/billing/invoices`                                                 | Owner                                    | Billing exception remains available read-only | Online only                                                                                                                                        |
| `/staff`, `/audit-log`                                                          | Owner/Admin                              | ManageUsers/audit permission                  | Online only                                                                                                                                        |
| `/notifications`, `/settings/notifications`                                     | Authenticated                            | User scope                                    | Online only                                                                                                                                        |
| `/settings/business`, `/settings/receipts`                                      | Owner/Admin                              | Tenant write                                  | Online only                                                                                                                                        |
| `/offline/review`                                                               | Manager/Approver                         | Same tenant/register + readiness contract     | Local rejected and `applied_with_conflict` state readable only after unlock; `acceptAsIs` / `adjustWithReason` and rejected-sale resolution online |

## Navigation Behavior

- The shell exposes only routes relevant to the current permission, subscription, and
  location context.
- Route links preserve meaningful filters in the URL; dashboard detail URLs are
  validated before navigation.
- Location switching cancels requests, clears location-scoped caches, and cannot occur
  during a POS cart or offline prepared shift without explicit safe exit.
- Register switching requires an online preparation flow and cannot adopt another
  register's local partition.
- Read-only subscription retains view, billing, invoice, and export routes; mutations
  are disabled before entry where possible and still handle server 402.
- A plan-locked route shows the exact backend-provided limit/feature and upgrade path;
  it does not render a fake empty state.
- Profit/cost columns and payload fields are absent when ViewProfit is absent; client
  masking alone is insufficient.

## Responsive Shell

- At 320px, primary route content uses one column and no page-level horizontal scroll.
- Dense tables switch to purpose-built row/detail layouts or controlled internal table
  scrolling with sticky identifiers; they never force the entire page width.
- Desktop POS keeps product acquisition, cart, totals, and payment in one workspace.
- Mobile POS keeps the cart context while scanner/search/payment panels occupy the
  available surface.
- Navigation drawers restore focus to their trigger and close after route selection.

## Access Failure Outcomes

| Failure                       | Destination/State                                                         |
| ----------------------------- | ------------------------------------------------------------------------- |
| No session                    | Login with safe return path; no sensitive query remains                   |
| Expired/offline authorization | POS recovery state; cart/queue preserved; completion blocked              |
| Permission removed            | Nearest authorized route plus denial message                              |
| Location removed              | Location selection or account recovery; scoped cache cleared              |
| Plan/read-only                | Current route preserved when viewable; mutation recovery/upgrade panel    |
| Register mismatch             | Lock local partition and require same-register online authorization       |
| Live-only while offline       | Stay in POS context; control disabled with reason and connectivity status |
