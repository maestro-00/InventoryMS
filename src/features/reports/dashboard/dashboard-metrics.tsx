import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Package,
  ShoppingCart,
} from "lucide-react";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { DashboardContinuePanel } from "../../onboarding/dashboard-continue-panel";
import { AlertTile } from "../../dashboard/ui/alert-tile";
import { DashboardSalesPanel } from "../../dashboard/ui/dashboard-sales-panel";
import { DashboardSection } from "../../dashboard/ui/dashboard-section";
import { QuickActionCard, QuickActionRow } from "../../dashboard/ui/quick-action-card";
import {
  formatMetricDelta,
  StatCard,
  StatCardGrid,
  StatCardSkeleton,
} from "../../dashboard/ui/stat-card";
import { dashboardDetailLink } from "../../dashboard/utils/dashboard-detail-link";
import type { DashboardRecord } from "../api/reports-api";

export function DashboardMetricsSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardGrid>
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index}>
            <StatCardSkeleton />
          </li>
        ))}
      </StatCardGrid>
    </div>
  );
}

export function DashboardPanel({
  data,
  canViewProfit,
  canSell,
  canManageStock,
  canViewReports,
}: {
  data: DashboardRecord;
  canViewProfit: boolean;
  canSell?: boolean;
  canManageStock?: boolean;
  canViewReports?: boolean;
}) {
  const metrics = [
    {
      label: "Sales today",
      value: formatGhanaMoney(data.sales.today),
      delta: formatMetricDelta(data.sales.today, data.sales.sameDayLastWeek),
      link: dashboardDetailLink(data.sales.detailUrl),
    },
    {
      label: "Transactions",
      value: String(data.transactionCount.today),
      delta: formatMetricDelta(
        data.transactionCount.today,
        data.transactionCount.sameDayLastWeek,
      ),
      link: dashboardDetailLink(data.transactionCount.detailUrl),
    },
    {
      label: "Average basket",
      value: formatGhanaMoney(data.averageBasket.today),
      delta: formatMetricDelta(data.averageBasket.today, data.averageBasket.sameDayLastWeek),
      link: dashboardDetailLink(data.averageBasket.detailUrl),
    },
    {
      label: "Items sold",
      value: String(data.itemsSold.today),
      delta: formatMetricDelta(data.itemsSold.today, data.itemsSold.sameDayLastWeek),
      link: dashboardDetailLink(data.itemsSold.detailUrl),
    },
    {
      label: "Cash in drawer",
      value: formatGhanaMoney(data.cashInDrawer.today),
      delta: formatMetricDelta(data.cashInDrawer.today, data.cashInDrawer.sameDayLastWeek),
      link: dashboardDetailLink(data.cashInDrawer.detailUrl),
    },
  ];

  const quickActions = [
    canSell
      ? { label: "Open POS", to: "/pos" as const, icon: ShoppingCart, tone: "primary" as const }
      : null,
    canManageStock
      ? {
          label: "Add product",
          to: "/catalogue/products" as const,
          icon: Package,
          tone: "success" as const,
        }
      : null,
    canViewReports
      ? {
          label: "View reports",
          to: "/reports" as const,
          icon: BarChart3,
          tone: "muted" as const,
        }
      : null,
    canManageStock
      ? {
          label: "Review stock",
          to: "/inventory" as const,
          icon: Boxes,
          tone: "warning" as const,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      {quickActions.length > 0 ? (
        <DashboardSection title="Quick actions">
          <QuickActionRow>
            {quickActions.map((action) =>
              action ? (
                <QuickActionCard
                  key={action.label}
                  label={action.label}
                  to={action.to}
                  icon={action.icon}
                  tone={action.tone}
                />
              ) : null,
            )}
          </QuickActionRow>
        </DashboardSection>
      ) : null}

      <DashboardSection title="Performance" description="Today compared with the same weekday last week">
        <StatCardGrid>
          {metrics.map((metric) => (
            <li key={metric.label}>
              <StatCard
                label={metric.label}
                value={metric.value}
                delta={metric.delta.label}
                trend={metric.delta.trend}
                to={metric.link.to}
                search={metric.link.search}
              />
            </li>
          ))}
        </StatCardGrid>
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardSalesPanel
            todaySales={data.sales.today}
            priorSales={data.sales.sameDayLastWeek}
          />
        </div>

        <div className="space-y-3">
          <DashboardContinuePanel />
          <DashboardSection title="Alerts">
            <div className="space-y-3">
              <AlertTile
                label="Low stock warnings"
                count={data.lowStockWarnings}
                description="Review items below reorder level"
                to="/inventory"
                icon={AlertTriangle}
                tone="warning"
              />
              <AlertTile
                label="Expiry warnings"
                count={data.expiryWarnings}
                description="Check batches nearing expiry"
                to="/inventory/batches"
                icon={AlertTriangle}
                tone="destructive"
              />
              {data.lowStockWarnings === 0 && data.expiryWarnings === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    No stock alerts right now.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </DashboardSection>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sellers today</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No top sellers today.</p>
            ) : (
              <ul className="space-y-3">
                {data.topSellers.map((seller) => {
                  const link = dashboardDetailLink(seller.detailUrl);
                  return (
                    <li key={seller.productId}>
                      <Link
                        to={link.to}
                        search={link.search}
                        className="app-surface-card flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:border-primary/25"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {seller.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seller.quantity} sold
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">
                          {formatGhanaMoney(seller.sales)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gross profit</CardTitle>
          </CardHeader>
          <CardContent>
            {canViewProfit && data.grossProfit != null ? (
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatGhanaMoney(data.grossProfit)}
              </p>
            ) : (
              <Alert>
                <AlertTitle>Profit hidden</AlertTitle>
                <AlertDescription>
                  Gross profit requires ViewProfit permission.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { DashboardPanel as DashboardMetrics };
