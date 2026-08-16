import { Link } from "@tanstack/react-router";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import type { DashboardRecord } from "../api/reports-api";
import type { ReportKind } from "../api/reports-api";

function comparison(today: string, prior: string): string {
  const delta = Number(today) - Number(prior);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} vs last week`;
}

export function DashboardPanel({
  data,
  canViewProfit,
}: {
  data: DashboardRecord;
  canViewProfit: boolean;
}) {
  const cards: Array<{
    label: string;
    value: string;
    detail: string;
    kind: ReportKind;
  }> = [
    {
      label: "Sales today",
      value: formatGhanaMoney(data.sales.today),
      detail: comparison(data.sales.today, data.sales.sameDayLastWeek),
      kind: "sales",
    },
    {
      label: "Transactions",
      value: String(data.transactionCount.today),
      detail: comparison(
        String(data.transactionCount.today),
        String(data.transactionCount.sameDayLastWeek),
      ),
      kind: "sales",
    },
    {
      label: "Average basket",
      value: formatGhanaMoney(data.averageBasket.today),
      detail: comparison(data.averageBasket.today, data.averageBasket.sameDayLastWeek),
      kind: "sales",
    },
    {
      label: "Cash in drawer",
      value: formatGhanaMoney(data.cashInDrawer.today),
      detail: comparison(data.cashInDrawer.today, data.cashInDrawer.sameDayLastWeek),
      kind: "staff",
    },
  ];

  return (
    <section aria-label="Dashboard metrics" className="space-y-6">
      <h2>Performance</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <li key={card.label}>
            <Link
              to="/reports"
              search={{ kind: card.kind }}
              className="block underline-offset-2 hover:underline"
            >
              <span className="block text-sm text-muted-foreground">{card.label}</span>
              <span className="block text-2xl font-semibold">{card.value}</span>
              <span className="block text-sm">{card.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p>
        Low stock warnings: {data.lowStockWarnings}. Expiry warnings:{" "}
        {data.expiryWarnings}.
      </p>
      {canViewProfit && data.grossProfit != null ? (
        <p>Gross profit today: {formatGhanaMoney(data.grossProfit)}</p>
      ) : (
        <p>Gross profit is hidden without ViewProfit.</p>
      )}
      <div>
        <h3>Top sellers</h3>
        <ul>
          {data.topSellers.map((seller) => (
            <li key={seller.productId}>
              <Link to="/reports" search={{ kind: "sales" }}>
                {seller.productName}: {seller.quantity} ·{" "}
                {formatGhanaMoney(seller.sales)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { DashboardPanel as DashboardMetrics };
