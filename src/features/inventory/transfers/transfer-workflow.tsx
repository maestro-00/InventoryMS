import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useActiveLocationId } from "../../../shared/location/use-active-location";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "../locations/api/location-queries";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import {
  createTransfer,
  dispatchTransfer,
  fetchTransfers,
  receiveTransfer,
  type TransferRecord,
} from "./api/transfers-api";

export function TransferWorkflow() {
  const queryClient = useQueryClient();
  const locations = useLocations();
  const activeLocationId = useActiveLocationId();
  const products = useQuery({
    queryKey: ["products-for-transfer"],
    queryFn: () => fetchProducts({ pageSize: 100 }),
  });
  const awaiting = useQuery({
    queryKey: ["transfers", "Dispatched"],
    queryFn: () => fetchTransfers({ status: "Dispatched" }),
  });

  const [fromOverride, setFromOverride] = useState<string | null>(null);
  const fromLocationId = fromOverride ?? activeLocationId;
  const [toLocationId, setTo] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [active, setActive] = useState<TransferRecord | null>(null);
  const [receivedQty, setReceivedQty] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createTransfer({
        fromLocationId,
        toLocationId,
        lines: [{ productId, quantity }],
      }),
    onSuccess: (transfer) => {
      setActive(transfer);
    },
  });

  const dispatch = useMutation({
    mutationFn: (id: string) => dispatchTransfer(id),
    onSuccess: (transfer) => {
      setActive(transfer);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
    },
  });

  const receive = useMutation({
    mutationFn: () => {
      if (!active?.lines[0]) throw new Error("No transfer line");
      return receiveTransfer(active.id, {
        lines: [{ lineId: active.lines[0].id, quantityReceived: receivedQty }],
        ...(discrepancyReason ? { discrepancyReason } : {}),
      });
    },
    onSuccess: (transfer) => {
      setActive(transfer);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  if (locations.isPending || products.isPending) {
    return <LoadingState label="Loading transfer form" />;
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Stock transfers">
      <div className="flex flex-col gap-3">
        <SelectField
          label="From location"
          required
          value={fromLocationId}
          options={(locations.data ?? []).map((location) => ({
            value: location.id,
            label: location.name,
          }))}
          onChange={(event) => {
            setFromOverride(event.target.value);
          }}
        />
        <SelectField
          label="To location"
          required
          value={toLocationId}
          options={(locations.data ?? []).map((location) => ({
            value: location.id,
            label: location.name,
          }))}
          onChange={(event) => {
            setTo(event.target.value);
          }}
        />
        <SelectField
          label="Product"
          required
          value={productId}
          options={(products.data?.items ?? []).map((product) => ({
            value: product.id,
            label: product.name,
          }))}
          onChange={(event) => {
            setProductId(event.target.value);
          }}
        />
        <TextField
          label="Quantity to dispatch"
          required
          inputMode="decimal"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
          }}
        />
        <Button
          type="button"
          onClick={() => {
            create.mutate();
          }}
        >
          Create draft transfer
        </Button>
      </div>

      {active ? (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p>
            Transfer {active.status}
            {active.discrepancyReason ? ` · ${active.discrepancyReason}` : ""}
          </p>
          {active.status === "Draft" ? (
            <Button
              type="button"
              onClick={() => {
                dispatch.mutate(active.id);
              }}
            >
              Dispatch transfer
            </Button>
          ) : null}
          {active.status === "Dispatched" || active.status === "Draft" ? null : null}
          {active.status === "Dispatched" ? (
            <>
              <TextField
                label="Quantity received"
                required
                inputMode="decimal"
                value={receivedQty}
                onChange={(event) => {
                  setReceivedQty(event.target.value);
                }}
              />
              <TextField
                label="Discrepancy reason"
                hint="Required when received quantity differs from dispatched."
                value={discrepancyReason}
                onChange={(event) => {
                  setDiscrepancyReason(event.target.value);
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  receive.mutate();
                }}
              >
                Receive transfer
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold">Awaiting receipt</h2>
        {awaiting.isPending ? (
          <LoadingState label="Loading dispatched transfers" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(awaiting.data?.items ?? []).map((transfer) => (
              <li key={transfer.id}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActive(transfer);
                    setReceivedQty(transfer.lines[0]?.qtyDispatched ?? "");
                  }}
                >
                  Open transfer {transfer.id.slice(0, 8)}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toProblem(create.error) ? (
        <ProblemSummary problem={toProblem(create.error)} />
      ) : null}
      {toProblem(dispatch.error) ? (
        <ProblemSummary problem={toProblem(dispatch.error)} />
      ) : null}
      {toProblem(receive.error) ? (
        <ProblemSummary problem={toProblem(receive.error)} />
      ) : null}
    </section>
  );
}
