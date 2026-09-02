import { describe, expect, it } from "vitest";
import { dashboardDetailLink } from "./dashboard-detail-link";

describe("dashboardDetailLink", () => {
  it("maps staff detail URLs", () => {
    expect(dashboardDetailLink("/reports/staff/abc")).toEqual({
      to: "/reports",
      search: { kind: "staff" },
    });
  });

  it("maps profit detail URLs", () => {
    expect(dashboardDetailLink("/reports/profit/abc")).toEqual({
      to: "/reports",
      search: { kind: "profit" },
    });
  });

  it("maps stock detail URLs", () => {
    expect(dashboardDetailLink("/reports/stock/abc")).toEqual({
      to: "/reports",
      search: { kind: "stock" },
    });
  });

  it("defaults to sales", () => {
    expect(dashboardDetailLink("/reports/sales/abc")).toEqual({
      to: "/reports",
      search: { kind: "sales" },
    });
  });
});
