import type { LinkProps } from "@tanstack/react-router";
import type { ReportKind } from "../../reports/api/reports-api";

export function dashboardDetailLink(detailUrl: string): {
  to: LinkProps["to"];
  search?: LinkProps["search"];
} {
  const normalized = detailUrl.toLowerCase();
  if (normalized.includes("/reports/staff")) {
    return { to: "/reports", search: { kind: "staff" satisfies ReportKind } };
  }
  if (normalized.includes("/reports/profit")) {
    return { to: "/reports", search: { kind: "profit" satisfies ReportKind } };
  }
  if (normalized.includes("/reports/stock")) {
    return { to: "/reports", search: { kind: "stock" satisfies ReportKind } };
  }
  return { to: "/reports", search: { kind: "sales" satisfies ReportKind } };
}
