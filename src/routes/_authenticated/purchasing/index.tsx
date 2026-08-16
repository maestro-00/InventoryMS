import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SupplierMaintenance } from "../../../features/purchasing/suppliers/supplier-list";
import { CreateOrdersFromReorder } from "../../../features/purchasing/reorder/create-orders";
import { PurchaseOrderWorkspace } from "../../../features/purchasing/orders/purchase-order-list";
import { GoodsReceiptForm } from "../../../features/purchasing/receipts/goods-receipt";
import { SupplierInvoiceForm } from "../../../features/purchasing/invoices/supplier-invoice-form";
import { LandedCostForm } from "../../../features/purchasing/landed-costs/landed-cost-form";
import {
  fetchSuppliers,
  type PurchaseOrderRecord,
} from "../../../features/purchasing/api/purchasing-api";
import { fetchLocations } from "../../../features/inventory/locations/api/locations-api";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";

export const Route = createFileRoute("/_authenticated/purchasing/")({
  beforeLoad: ({ context }) => {
    const permissions = context.session?.permissions ?? [];
    if (
      !permissions.includes("ManagePurchasing") &&
      context.session?.role !== "Owner"
    ) {
      // Owners always manage purchasing in Cycle 1 demos; cashiers are blocked.
      if (context.session?.role === "Cashier") {
        throw new Error("Purchasing requires ManagePurchasing");
      }
    }
  },
  component: PurchasingPage,
});

function PurchasingPage() {
  const suppliers = useQuery({
    queryKey: ["purchasing", "suppliers"],
    queryFn: fetchSuppliers,
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations(),
  });
  const products = useQuery({
    queryKey: ["products", "purchasing"],
    queryFn: async () => {
      const { data, response } = await inventoryxClient.GET("/api/v1/products");
      if (!response.ok) throw new Error("Failed to load products");
      const raw = data as unknown;
      if (raw && typeof raw === "object" && "items" in raw) {
        return (raw as { items: Array<{ id: string; name: string }> }).items;
      }
      return [];
    },
  });
  const [order, setOrder] = useState<PurchaseOrderRecord | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-4">
      <h1>Purchasing</h1>
      <SupplierMaintenance />
      <CreateOrdersFromReorder
        locations={(locations.data ?? []).map((location) => ({
          id: location.id,
          name: location.name,
        }))}
      />
      <PurchaseOrderWorkspace
        suppliers={(suppliers.data ?? []).map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
        }))}
        locations={(locations.data ?? []).map((location) => ({
          id: location.id,
          name: location.name,
        }))}
        products={products.data ?? []}
        onSelectOrder={setOrder}
      />
      {order ? (
        <>
          <GoodsReceiptForm
            order={order}
            locationId={order.deliverToLocationId}
            onReceived={setReceiptId}
          />
          <SupplierInvoiceForm
            supplierId={order.supplierId}
            purchaseOrderId={order.id}
            productId={order.lines[0]?.productId ?? ""}
            orderedUnitCost={order.lines[0]?.unitCost ?? "0"}
          />
        </>
      ) : null}
      {receiptId ? <LandedCostForm goodsReceiptId={receiptId} /> : null}
    </main>
  );
}
