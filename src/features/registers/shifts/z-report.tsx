import { useQuery } from "@tanstack/react-query";
import { fetchZReport } from "./shifts-api";

export function ZReport({ shiftId }: { shiftId: string }) {
  const report = useQuery({
    queryKey: ["registers", "z-report", shiftId],
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
            <td>{report.data.salesTotal}</td>
          </tr>
          <tr>
            <th scope="row">Refunds</th>
            <td>{report.data.refundTotal ?? "0"}</td>
          </tr>
          <tr>
            <th scope="row">Discounts</th>
            <td>{report.data.discountTotal ?? "0"}</td>
          </tr>
          <tr>
            <th scope="row">Voids</th>
            <td>{report.data.voidTotal ?? "0"}</td>
          </tr>
          <tr>
            <th scope="row">Expected cash</th>
            <td>{report.data.expectedCash}</td>
          </tr>
          <tr>
            <th scope="row">Counted cash</th>
            <td>{report.data.countedCash}</td>
          </tr>
          <tr>
            <th scope="row">Variance</th>
            <td>{report.data.variance}</td>
          </tr>
        </tbody>
      </table>
      <ul>
        {report.data.tenders.map((tender) => (
          <li key={tender.tender}>
            {tender.tender}: {tender.amount}
          </li>
        ))}
      </ul>
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
