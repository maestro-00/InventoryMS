import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "../../../shared/auth/access-policy";
import { useSession } from "../../../shared/auth/session-context";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { EmptyState, LoadingState } from "../../../shared/ui/states/ui-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { fetchProducts } from "./api/products-api";

export function ProductList({ onCreate }: { onCreate: () => void }) {
  const { session } = useSession();
  const showCost = session ? hasPermission(session, "ViewProfit") : false;
  const products = useQuery({
    queryKey: ["products", session?.tenantId ?? "anonymous"],
    queryFn: () => fetchProducts({ pageSize: 50 }),
  });

  if (products.isPending) return <LoadingState label="Loading products" />;
  if (products.isError) return <ProblemSummary problem={toProblem(products.error)} />;

  if (products.data.items.length === 0) {
    return (
      <EmptyState
        title="No products yet. Add what you sell so it can be scanned at the till."
        actionLabel="Add your first product"
        onAction={onCreate}
      />
    );
  }

  return (
    <Table>
      <caption className="sr-only">Products</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Selling price</TableHead>
          {showCost ? <TableHead>Cost price</TableHead> : null}
          <TableHead>Tracking</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.data.items.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.sku ?? "—"}</TableCell>
            <TableCell>{formatGhanaMoney(product.sellingPrice)}</TableCell>
            {showCost ? (
              <TableCell>
                {product.costPrice ? formatGhanaMoney(product.costPrice) : "—"}
              </TableCell>
            ) : null}
            <TableCell>{product.trackingMode}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
