import { useQuery } from "@tanstack/react-query";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { formatOccurredAt } from "../../../shared/utils/date-time";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { fetchSales } from "./api/sales-api";

export function SaleHistory({ locationId }: { locationId?: string }) {
  const sales = useQuery({
    queryKey: ["sales", locationId ?? "all"],
    queryFn: () => fetchSales(locationId ? { locationId } : {}),
  });

  if (sales.isPending) return <LoadingState label="Loading sale history" />;
  if (sales.isError) return <ProblemSummary problem={toProblem(sales.error)} />;

  if (sales.data.items.length === 0) {
    return <p>No sales yet. Completed sales appear here with their totals.</p>;
  }

  return (
    <Table aria-label="Sale history">
      <TableHeader>
        <TableRow>
          <TableHead>Completed</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.data.items.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell>{formatOccurredAt(sale.occurredAt)}</TableCell>
            <TableCell>{sale.status}</TableCell>
            <TableCell>{formatGhanaMoney(sale.grandTotal)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
