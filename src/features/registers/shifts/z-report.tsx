import { useQuery } from "@tanstack/react-query";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { fetchZReport, zReportQueryKey } from "./shifts-api";

export function ZReport({ shiftId }: { shiftId: string }) {
  const report = useQuery({
    queryKey: zReportQueryKey(shiftId),
    queryFn: () => fetchZReport(shiftId),
  });

  if (report.isLoading) return <p>Loading Z report…</p>;
  if (report.isError) return <p role="alert">Z report unavailable.</p>;
  if (!report.data) return <p>Z report unavailable.</p>;

  return (
    <article aria-label="Z report" className="space-y-3">
      <h2>Z report</h2>
      <table>
        <caption>Shift totals</caption>
        <tbody>
          <tr>
            <th scope="row">Sales</th>
            <td>{formatGhanaMoney(report.data.sales)}</td>
          </tr>
          <tr>
            <th scope="row">Cash tendered</th>
            <td>{formatGhanaMoney(report.data.cashTendered)}</td>
          </tr>
          <tr>
            <th scope="row">Refunds</th>
            <td>{formatGhanaMoney(report.data.refunds)}</td>
          </tr>
          <tr>
            <th scope="row">Discounts</th>
            <td>{formatGhanaMoney(report.data.discounts)}</td>
          </tr>
          <tr>
            <th scope="row">Voids</th>
            <td>{report.data.voids}</td>
          </tr>
          <tr>
            <th scope="row">Expected cash</th>
            <td>{formatGhanaMoney(report.data.expectedCash)}</td>
          </tr>
          <tr>
            <th scope="row">Counted cash</th>
            <td>
              {report.data.countedCash === null
                ? "Pending count"
                : formatGhanaMoney(report.data.countedCash)}
            </td>
          </tr>
          <tr>
            <th scope="row">Variance</th>
            <td>
              {report.data.variance === null
                ? "Pending count"
                : formatGhanaMoney(report.data.variance)}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          window.print();
        }}
      >
        Print Z report
      </button>
    </article>
  );
}
