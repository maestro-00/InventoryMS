import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  fetchPurchaseOrders,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  type PurchaseOrderRecord,
} from "../api/purchasing-api";
import { nextActionLabel } from "./purchase-order-state";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { OrderActions } from "./order-actions";
import { OrderDocument } from "./order-document";
import { CloseShortForm } from "./close-short";

export function PurchaseOrderWorkspace({
  suppliers,
  locations,
  products,
  onSelectOrder,
}: {
  suppliers: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  onSelectOrder?: (order: PurchaseOrderRecord) => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("20");
  const [unitCost, setUnitCost] = useState("6.00");
  const [selected, setSelected] = useState<PurchaseOrderRecord | null>(null);

  const effectiveSupplierId = supplierId || suppliers[0]?.id || "";
  const effectiveLocationId = locationId || locations[0]?.id || "";
  const effectiveProductId = productId || products[0]?.id || "";

  const orders = useQuery({
    queryKey: ["purchasing", "orders", status],
    queryFn: () => fetchPurchaseOrders(status ? { status } : {}),
  });

  const create = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["purchasing", "orders"] });
      setSelected(order);
      onSelectOrder?.(order);
    },
  });

  const problem = toProblem(orders.error ?? create.error);
  const productName =
    products.find((product) => product.id === effectiveProductId)?.name ?? "Item";

  return (
    <section aria-label="Purchase orders" className="space-y-4">
      <h2>Purchase orders</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <SelectField
        label="Filter status"
        value={status}
        options={[
          { value: "", label: "All" },
          { value: "Draft", label: "Draft" },
          { value: "AwaitingApproval", label: "Awaiting approval" },
          { value: "Sent", label: "Sent" },
          { value: "PartiallyReceived", label: "Partially received" },
          { value: "FullyReceived", label: "Fully received" },
          { value: "Closed", label: "Closed" },
        ]}
        onChange={(event) => {
          setStatus(event.target.value);
        }}
      />
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({
            supplierId: effectiveSupplierId,
            deliverToLocationId: effectiveLocationId,
            lines: [
              {
                productId: effectiveProductId,
                description: productName,
                orderedQty: qty,
                unitCost,
              },
            ],
          });
        }}
      >
        <SelectField
          label="Supplier"
          required
          value={effectiveSupplierId}
          options={suppliers.map((supplier) => ({
            value: supplier.id,
            label: supplier.name,
          }))}
          onChange={(event) => {
            setSupplierId(event.target.value);
          }}
        />
        <SelectField
          label="Deliver to"
          required
          value={effectiveLocationId}
          options={locations.map((location) => ({
            value: location.id,
            label: location.name,
          }))}
          onChange={(event) => {
            setLocationId(event.target.value);
          }}
        />
        <SelectField
          label="Product"
          required
          value={effectiveProductId}
          options={products.map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          onChange={(event) => {
            setProductId(event.target.value);
          }}
        />
        <TextField
          label="Ordered qty"
          required
          value={qty}
          onChange={(e) => {
            setQty(e.target.value);
          }}
        />
        <TextField
          label="Unit cost"
          required
          value={unitCost}
          onChange={(e) => {
            setUnitCost(e.target.value);
          }}
        />
        <Button type="submit">Create draft order</Button>
      </form>

      <table>
        <caption>Paged purchase orders</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Status</th>
            <th scope="col">Total</th>
            <th scope="col">Next</th>
          </tr>
        </thead>
        <tbody>
          {(orders.data?.items ?? []).map((order) => (
            <tr key={order.id}>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(order);
                    onSelectOrder?.(order);
                  }}
                >
                  {order.id.slice(0, 8)}
                </button>
              </td>
              <td>{order.status}</td>
              <td>{order.total}</td>
              <td>{nextActionLabel(order.status) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <div className="space-y-4" aria-label="Selected purchase order">
          <OrderActions
            order={selected}
            onChanged={async (order) => {
              setSelected(order);
              await queryClient.invalidateQueries({
                queryKey: ["purchasing", "orders"],
              });
            }}
          />
          <OrderDocument orderId={selected.id} />
          <CloseShortForm
            order={selected}
            onClosed={async (order) => {
              setSelected(order);
              await queryClient.invalidateQueries({
                queryKey: ["purchasing", "orders"],
              });
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

export async function runOrderAction(
  order: PurchaseOrderRecord,
  action: "submit" | "approve" | "reject" | "cancel",
  reason?: string,
) {
  if (action === "submit") return submitPurchaseOrder(order.id);
  if (action === "approve") return approvePurchaseOrder(order.id);
  if (action === "reject") return rejectPurchaseOrder(order.id);
  return cancelPurchaseOrder(order.id, reason ?? "Cancelled by buyer");
}
