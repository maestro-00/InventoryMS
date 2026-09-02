import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { selectRadixOption } from "../../shared/test/select-radix";
import type { ReportFilter, ReportKind } from "./api/reports-api";
import { ReportFilters } from "./filters/report-filters";
import { StandardReportTable } from "./standard-reports/report-table";

describe("reporting presentation", () => {
  it("renders sales, profit gate, tax, and generic tables", () => {
    const { rerender } = render(
      <StandardReportTable
        kind="sales"
        canViewProfit
        data={{
          totalSales: "40.00",
          rows: [
            {
              saleId: "s1",
              occurredAt: "2026-08-01T10:00:00Z",
              staffId: "staff-1",
              total: "40.00",
              status: "Completed",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/Total sales/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();

    rerender(
      <StandardReportTable kind="profit" canViewProfit={false} data={{ rows: [] }} />,
    );
    expect(screen.getByText(/require ViewProfit/i)).toBeInTheDocument();

    rerender(
      <StandardReportTable
        kind="profit"
        canViewProfit
        data={{
          rows: [
            {
              productId: "p1",
              productName: "Sugar",
              revenue: "40",
              cost: "20",
              grossProfit: "20",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Sugar")).toBeInTheDocument();

    rerender(
      <StandardReportTable
        kind="tax"
        canViewProfit
        data={{
          totalTax: 5,
          components: [{ code: "NHIL", name: "NHIL", rate: "2.5%", amount: "5" }],
        }}
      />,
    );
    expect(screen.getAllByText("NHIL").length).toBeGreaterThan(0);

    rerender(
      <StandardReportTable
        kind="sales"
        canViewProfit
        data={{
          totalSales: { nested: true },
          rows: "not-an-array",
        }}
      />,
    );
    expect(screen.getByText(/Total sales/i)).toBeInTheDocument();

    rerender(
      <StandardReportTable
        kind="tax"
        canViewProfit
        data={{
          totalTax: null,
          components: [{ code: "GETFUND", name: "GETFund", rate: "2.5%", amount: "3" }],
        }}
      />,
    );
    expect(screen.getAllByText("GETFUND").length).toBeGreaterThan(0);

    rerender(
      <StandardReportTable
        kind="stock"
        canViewProfit
        data={{
          rows: [
            { productName: "Sugar", onHand: "8" },
            { supplierName: "Tema", orderedValue: "120" },
            { staffId: "cashier-1", sales: "40" },
            { status: "Open" },
          ],
        }}
      />,
    );
    expect(screen.getByText("stock report")).toBeInTheDocument();
    expect(screen.getByText("Sugar")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Tema")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("cashier-1")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();

    rerender(
      <StandardReportTable kind="purchasing" canViewProfit data={{ rows: [] }} />,
    );
    expect(screen.getByText("purchasing report")).toBeInTheDocument();
  });

  it("updates report filters for kind, dates, and location", async () => {
    const user = userEvent.setup();
    const onKindChange = vi.fn();
    const onFilterChange = vi.fn();

    function Harness() {
      const [kind, setKind] = useState<ReportKind>("sales");
      const [filter, setFilter] = useState<ReportFilter>({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-08T00:00:00.000Z",
      });
      return (
        <ReportFilters
          kind={kind}
          filter={filter}
          locations={[{ id: "loc-1", name: "Makola" }]}
          onKindChange={(next) => {
            onKindChange(next);
            setKind(next);
          }}
          onFilterChange={(next) => {
            onFilterChange(next);
            setFilter(next);
          }}
        />
      );
    }

    render(<Harness />);
    await selectRadixOption(user, screen.getByLabelText(/^report$/i), "tax");
    expect(onKindChange).toHaveBeenCalledWith("tax");
    await selectRadixOption(user, screen.getByLabelText(/^location$/i), "loc-1");
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "loc-1" }),
    );
    await selectRadixOption(user, screen.getByLabelText(/^location$/i), "");
    const lastCall = onFilterChange.mock.calls.at(-1)?.[0] as
      { locationId?: string } | undefined;
    expect(lastCall?.locationId).toBeUndefined();
  });
});
