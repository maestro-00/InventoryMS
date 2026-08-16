import { lazy, Suspense } from "react";

const SalesChartLazy = lazy(async () => {
  const { SalesTrendChart } = await import("./sales-trend-chart");
  return { default: SalesTrendChart };
});

export function ReportChart({
  points,
}: {
  points: Array<{ label: string; value: number }>;
}) {
  return (
    <section aria-label="Report chart" className="space-y-3">
      <h3>Chart view</h3>
      <Suspense fallback={<p>Loading chart…</p>}>
        <SalesChartLazy points={points} />
      </Suspense>
      <table>
        <caption>Accessible chart equivalent</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
