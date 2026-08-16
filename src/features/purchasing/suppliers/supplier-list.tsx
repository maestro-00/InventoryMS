import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  createSupplier,
  fetchSupplierOrders,
  fetchSupplierPerformance,
  fetchSupplierProducts,
  fetchSuppliers,
  putSupplierProducts,
  supplierInputSchema,
} from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function SupplierMaintenance() {
  const queryClient = useQueryClient();
  const suppliers = useQuery({
    queryKey: ["purchasing", "suppliers"],
    queryFn: fetchSuppliers,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [currency, setCurrency] = useState("GHS");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["purchasing", "suppliers"] });
      setName("");
      setEmail("");
      setPhone("");
    },
  });

  const products = useQuery({
    queryKey: ["purchasing", "supplier-products", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("Supplier id is required");
      return fetchSupplierProducts(selectedId);
    },
    enabled: Boolean(selectedId),
  });
  const orders = useQuery({
    queryKey: ["purchasing", "supplier-orders", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("Supplier id is required");
      return fetchSupplierOrders(selectedId);
    },
    enabled: Boolean(selectedId),
  });
  const performance = useQuery({
    queryKey: ["purchasing", "supplier-performance", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("Supplier id is required");
      return fetchSupplierPerformance(selectedId);
    },
    enabled: Boolean(selectedId),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = supplierInputSchema.safeParse({
      name,
      email,
      phone,
      paymentTerms,
      leadTimeDays,
      currency,
    });
    if (!parsed.success) return;
    create.mutate(parsed.data);
  }

  const problem = toProblem(create.error ?? suppliers.error);

  return (
    <section aria-label="Suppliers" className="space-y-4">
      <h2>Suppliers</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submit} noValidate>
        <TextField
          label="Supplier name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
          }}
        />
        <TextField
          label="Payment terms"
          value={paymentTerms}
          onChange={(e) => {
            setPaymentTerms(e.target.value);
          }}
        />
        <TextField
          label="Lead time (days)"
          inputMode="numeric"
          value={leadTimeDays}
          onChange={(e) => {
            setLeadTimeDays(e.target.value);
          }}
        />
        <TextField
          label="Currency"
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value);
          }}
        />
        <Button type="submit" disabled={create.isPending}>
          Save supplier
        </Button>
      </form>
      <ul className="space-y-2">
        {(suppliers.data ?? []).map((supplier) => (
          <li key={supplier.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedId(supplier.id);
              }}
            >
              {supplier.name}
            </button>
          </li>
        ))}
      </ul>
      {selectedId ? (
        <div className="space-y-3" aria-label="Supplier detail">
          <h3>Supplier products and history</h3>
          {performance.data ? (
            <p>
              On-time {performance.data.onTimeRate ?? "—"} · fill{" "}
              {performance.data.fillRate ?? "—"} · lead{" "}
              {performance.data.averageLeadTimeDays ?? "—"} days
            </p>
          ) : null}
          <ul>
            {(products.data ?? []).map((row) => (
              <li key={row.productId}>
                {row.productId} · {row.supplierCode ?? "no code"} ·{" "}
                {row.lastPrice ?? "—"}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={() => {
              void putSupplierProducts(selectedId, [
                {
                  productId: "44444444-4444-4444-8444-444444444444",
                  supplierCode: "TW-SUG",
                  price: 6,
                },
              ]);
            }}
          >
            Save product codes
          </Button>
          <h4>Order history</h4>
          <ul>
            {(orders.data ?? []).map((order) => (
              <li key={order.id}>
                {order.id} · {order.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export { SupplierMaintenance as SupplierList };
