import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { OPENING_STOCK_STEP } from "../../onboarding/completion";
import { useMarkOnboardingStep } from "../../onboarding/mark-onboarding-step";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import { useLocations } from "../locations/api/location-queries";
import {
  openingStockInputSchema,
  recordOpeningStock,
  type AdjustmentOutcome,
} from "./api/opening-stock-api";

export function OpeningStockForm({ onRecorded }: { onRecorded?: () => void } = {}) {
  const queryClient = useQueryClient();
  const locations = useLocations();
  const markOnboardingStep = useMarkOnboardingStep();
  const products = useQuery({
    queryKey: ["opening-stock", "products"],
    queryFn: () => fetchProducts({ pageSize: 200 }),
  });

  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<AdjustmentOutcome | null>(null);

  const mutation = useMutation({
    mutationFn: recordOpeningStock,
    onSuccess: (result) => {
      setOutcome(result);
      void queryClient.invalidateQueries({ queryKey: ["stock"] });
      markOnboardingStep(OPENING_STOCK_STEP);
      onRecorded?.();
    },
  });

  const locationName =
    locations.data?.find((location) => location.id === locationId)?.name ?? "";

  // Keep the success panel mounted even if locations/products refetch flips
  // isPending (Firefox was losing the Applied status mid-assertion).
  if (outcome) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="status">
          {outcome.status} — opening stock recorded at {locationName}.
        </p>
        <Button
          type="button"
          onClick={() => {
            setOutcome(null);
            setQuantity("0");
          }}
        >
          Record another opening quantity
        </Button>
      </div>
    );
  }

  if (locations.isLoading || products.isLoading) {
    return <LoadingState label="Loading locations and products" />;
  }

  const locationOptions = [
    { value: "", label: "Select a location" },
    ...(locations.data ?? []).map((location) => ({
      value: location.id,
      label: location.name,
    })),
  ];
  const productOptions = [
    { value: "", label: "Select a product" },
    ...(products.data?.items ?? []).map((product) => ({
      value: product.id,
      label: product.name,
    })),
  ];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = openingStockInputSchema.safeParse({
      locationId,
      reasonCode: "Correction",
      note: "Opening stock",
      lines: [{ productId, qtyDelta: quantity }],
    });
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    mutation.mutate(parsed.data);
  }

  const problem = toProblem(mutation.error);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the opening quantity"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <SelectField
        label="Location"
        required
        options={locationOptions}
        value={locationId}
        onChange={(event) => {
          setLocationId(event.target.value);
        }}
      />
      <SelectField
        label="Product"
        required
        options={productOptions}
        value={productId}
        onChange={(event) => {
          setProductId(event.target.value);
        }}
      />
      <TextField
        label="Opening quantity"
        required
        inputMode="decimal"
        hint="Counted units on hand today. InventoryX records this as a Correction movement."
        value={quantity}
        onChange={(event) => {
          setQuantity(event.target.value);
        }}
      />

      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        Record opening stock
      </Button>
    </form>
  );
}
