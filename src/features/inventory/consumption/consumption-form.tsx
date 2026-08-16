import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "../locations/api/location-queries";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import {
  fetchAdjustmentReasons,
  recordConsumption,
} from "../adjustments/api/adjustments-api";

export function ConsumptionForm() {
  const queryClient = useQueryClient();
  const locations = useLocations();
  const products = useQuery({
    queryKey: ["products-for-consumption"],
    queryFn: () => fetchProducts({ pageSize: 100 }),
  });
  const reasons = useQuery({
    queryKey: ["adjustment-reasons"],
    queryFn: fetchAdjustmentReasons,
  });
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [qtyDelta, setQtyDelta] = useState("");
  const [reasonCode, setReasonCode] = useState("PersonalUse");
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      recordConsumption({
        locationId,
        reasonCode,
        ...(note ? { note } : {}),
        lines: [{ productId, qtyDelta }],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  if (locations.isPending || products.isPending || reasons.isPending) {
    return <LoadingState label="Loading consumption form" />;
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Internal consumption">
      <SelectField
        label="Location"
        required
        value={locationId}
        options={(locations.data ?? []).map((location) => ({
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
        label="Quantity used"
        required
        inputMode="decimal"
        hint="Enter a negative delta to reduce on-hand stock."
        value={qtyDelta}
        onChange={(event) => {
          setQtyDelta(event.target.value);
        }}
      />
      <SelectField
        label="Reason"
        required
        value={reasonCode}
        options={(reasons.data ?? [])
          .filter((reason) => reason.code !== "Correction")
          .map((reason) => ({ value: reason.code, label: reason.name }))}
        onChange={(event) => {
          setReasonCode(event.target.value);
        }}
      />
      <TextField
        label="Note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
        }}
      />
      <Button
        type="button"
        onClick={() => {
          submit.mutate();
        }}
      >
        Record consumption
      </Button>
      {submit.data ? <p role="status">Consumption {submit.data.status}.</p> : null}
      {toProblem(submit.error) ? (
        <ProblemSummary problem={toProblem(submit.error)} />
      ) : null}
    </section>
  );
}
