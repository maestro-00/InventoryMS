import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/ui/tabs";
import { SupplierMaintenance } from "../../../features/purchasing/suppliers/supplier-list";
import { CreateOrdersFromReorder } from "../../../features/purchasing/reorder/create-orders";
import { PurchaseOrderWorkspace } from "../../../features/purchasing/orders/purchase-order-list";
import { GoodsReceiptForm } from "../../../features/purchasing/receipts/goods-receipt";
import { CloseShortForm } from "../../../features/purchasing/orders/close-short";
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
      if (context.session?.role === "Cashier") {
        throw new Error("Purchasing requires ManagePurchasing");
      }
    }
  },
  component: PurchasingPage,
});

export function PurchasingPage() {
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

  const locationOptions = (locations.data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
  }));

  const supplierOptions = (suppliers.data ?? []).map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">Purchasing</h1>
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="receive">Receive</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <SupplierMaintenance />
        </TabsContent>

        <TabsContent value="orders" className="flex flex-col gap-6">
          <CreateOrdersFromReorder locations={locationOptions} />
          <PurchaseOrderWorkspace
            suppliers={supplierOptions}
            locations={locationOptions}
            products={products.data ?? []}
            onSelectOrder={setOrder}
          />
        </TabsContent>

        <TabsContent value="receive" className="flex flex-col gap-6">
          {order ? (
            <>
              <GoodsReceiptForm
                order={order}
                locationId={order.deliverToLocationId}
                onReceived={(receiptId) => {
                  setReceiptId(receiptId);
                  setOrder({ ...order, status: "PartiallyReceived" });
                }}
              />
              <CloseShortForm
                order={order}
                onClosed={(closed) => {
                  setOrder(closed);
                }}
              />
            </>
          ) : (
            <p>Select a purchase order from the Orders tab to receive goods.</p>
          )}
        </TabsContent>

        <TabsContent value="costs" className="flex flex-col gap-6">
          {order ? (
            <SupplierInvoiceForm
              supplierId={order.supplierId}
              purchaseOrderId={order.id}
              productId={order.lines[0]?.productId ?? ""}
              orderedUnitCost={order.lines[0]?.unitCost ?? "0"}
            />
          ) : null}
          {receiptId ? <LandedCostForm goodsReceiptId={receiptId} /> : null}
          {!order && !receiptId ? (
            <p>Receive goods first, then record supplier invoices and landed costs.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </main>
  );
}
