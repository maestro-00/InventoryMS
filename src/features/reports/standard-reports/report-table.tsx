import { formatGhanaMoney } from "../../../shared/money/decimal";
import type { ReportKind } from "../api/reports-api";

function asRowArray(value: unknown): Array<Record<string, string | number>> {
  return Array.isArray(value) ? (value as Array<Record<string, string | number>>) : [];
}

function moneyField(value: unknown, fallback = "0"): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

export function StandardReportTable({
  kind,
  data,
  canViewProfit,
}: {
  kind: ReportKind;
  data: Record<string, unknown>;
  canViewProfit: boolean;
}) {
  if (kind === "sales") {
    const rows = asRowArray(data.rows);
    return (
      <table>
        <caption>Sales report</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Staff</th>
            <th scope="col">Total</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.saleId)}>
              <td>{String(row.occurredAt)}</td>
              <td>{String(row.staffId)}</td>
              <td>{formatGhanaMoney(String(row.total))}</td>
              <td>{String(row.status)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total sales</td>
            <td colSpan={2}>{formatGhanaMoney(moneyField(data.totalSales))}</td>
          </tr>
        </tfoot>
      </table>
    );
  }

  if (kind === "profit") {
    if (!canViewProfit) {
      return <p role="status">Profit columns require ViewProfit.</p>;
    }
    const rows = asRowArray(data.rows) as Array<Record<string, string>>;
    return (
      <table>
        <caption>Profit report</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Revenue</th>
            <th scope="col">Cost</th>
            <th scope="col">Gross profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId}>
              <td>{row.productName}</td>
              <td>{formatGhanaMoney(row.revenue ?? "0")}</td>
              <td>{formatGhanaMoney(row.cost ?? "0")}</td>
              <td>{formatGhanaMoney(row.grossProfit ?? "0")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (kind === "tax") {
    const components = asRowArray(data.components) as Array<Record<string, string>>;
    return (
      <table>
        <caption>Ghana tax report</caption>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Name</th>
            <th scope="col">Rate</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {components.map((row) => (
            <tr key={row.code}>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.rate}</td>
              <td>{formatGhanaMoney(row.amount ?? "0")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total tax</td>
            <td>{formatGhanaMoney(moneyField(data.totalTax))}</td>
          </tr>
        </tfoot>
      </table>
    );
  }

  const rows = asRowArray(data.rows);
  return (
    <table>
      <caption>{kind} report</caption>
      <thead>
        <tr>
          <th scope="col">Row</th>
          <th scope="col">Detail</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td>
              {String(row.productName ?? row.supplierName ?? row.staffId ?? index)}
            </td>
            <td>
              {String(
                row.value ??
                  row.orderedValue ??
                  row.sales ??
                  row.onHand ??
                  row.status ??
                  "",
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
