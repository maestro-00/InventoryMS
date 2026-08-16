import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesTrendChart({
  points,
}: {
  points: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Sales trend bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
