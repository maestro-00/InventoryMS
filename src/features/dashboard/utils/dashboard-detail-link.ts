import type { ReportKind } from "../../reports/api/reports-api";

export function dashboardDetailLink(detailUrl: string): {
  to: "/reports";
  search: { kind: ReportKind };
} {
  const normalized = detailUrl.toLowerCase();
  if (normalized.includes("/reports/staff")) {
    return { to: "/reports", search: { kind: "staff" } };
  }
  if (normalized.includes("/reports/profit")) {
    return { to: "/reports", search: { kind: "profit" } };
  }
  if (normalized.includes("/reports/stock")) {
    return { to: "/reports", search: { kind: "stock" } };
  }
  return { to: "/reports", search: { kind: "sales" } };
}
