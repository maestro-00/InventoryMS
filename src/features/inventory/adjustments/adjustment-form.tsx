import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { hasPermission } from "../../../shared/auth/access-policy";
import { useActiveLocationId } from "../../../shared/location/use-active-location";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "../locations/api/location-queries";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import {
  approveAdjustment,
  fetchAdjustmentReasons,
  recordAdjustment,
  rejectAdjustment,
} from "./api/adjustments-api";

export function AdjustmentForm() {
  const { session } = useSession();
  const canApprove = hasPermission(session, "ApproveAdjustments");
  const queryClient = useQueryClient();
  const locations = useLocations();
  const activeLocationId = useActiveLocationId();
  const products = useQuery({
    queryKey: ["products-for-adjustment"],
    queryFn: () => fetchProducts({ pageSize: 100 }),
  });
  const reasons = useQuery({
    queryKey: ["adjustment-reasons"],
    queryFn: fetchAdjustmentReasons,
  });

  const [locationOverride, setLocationOverride] = useState<string | null>(null);
  const locationId = locationOverride ?? activeLocationId;
  const [productId, setProductId] = useState("");
  const [qtyDelta, setQtyDelta] = useState("");
  const [reasonCode, setReasonCode] = useState("Correction");
  const [note, setNote] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      recordAdjustment({
        locationId,
        reasonCode,
        ...(note ? { note } : {}),
        lines: [{ productId, qtyDelta }],
      }),
    onSuccess: (result) => {
      if (result.status === "PendingApproval" && result.adjustmentId) {
        setPendingId(result.adjustmentId);
      } else {
        setPendingId(null);
        void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
        void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      }
    },
  });

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") => {
      if (!pendingId) throw new Error("No pending adjustment");
      return action === "approve"
        ? approveAdjustment(pendingId)
        : rejectAdjustment(pendingId);
    },
    onSuccess: () => {
      setPendingId(null);
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  if (locations.isPending || products.isPending || reasons.isPending) {
    return <LoadingState label="Loading adjustment form" />;
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Stock adjustment">
      <SelectField
        label="Location"
        required
        value={locationId}
        options={(locations.data ?? []).map((location) => ({
          value: location.id,
          label: location.name,
        }))}
        onChange={(event) => {
          setLocationOverride(event.target.value);
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
        label="Quantity delta"
        required
        inputMode="decimal"
        value={qtyDelta}
        onChange={(event) => {
          setQtyDelta(event.target.value);
        }}
      />
      <SelectField
        label="Reason"
        required
        value={reasonCode}
        options={(reasons.data ?? []).map((reason) => ({
          value: reason.code,
          label: reason.name,
        }))}
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
        Submit adjustment
      </Button>
      {pendingId ? <p role="status">Adjustment pending approval.</p> : null}
      {submit.data?.status === "Applied" || decide.data?.status === "Applied" ? (
        <p role="status">Adjustment applied.</p>
      ) : null}
      {pendingId && canApprove ? (
        <span className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              decide.mutate("approve");
            }}
          >
            Approve adjustment
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              decide.mutate("reject");
            }}
          >
            Reject adjustment
          </Button>
        </span>
      ) : null}
      {toProblem(submit.error) ? (
        <ProblemSummary problem={toProblem(submit.error)} />
      ) : null}
      {toProblem(decide.error) ? (
        <ProblemSummary problem={toProblem(decide.error)} />
      ) : null}
    </section>
  );
}
