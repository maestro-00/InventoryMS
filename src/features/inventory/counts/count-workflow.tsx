import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { hasPermission } from "../../../shared/auth/access-policy";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "../locations/api/location-queries";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import { CountScanner } from "./count-scanner";
import {
  approveStockCount,
  openStockCount,
  rejectStockCount,
  submitStockCount,
  updateCountLines,
  type StockCountRecord,
} from "./api/counts-api";

export function CountWorkflow() {
  const { session } = useSession();
  const canApprove = hasPermission(session, "ApproveAdjustments");
  const queryClient = useQueryClient();
  const locations = useLocations();
  const products = useQuery({
    queryKey: ["products-for-count"],
    queryFn: () => fetchProducts({ pageSize: 100 }),
  });

  const [locationId, setLocationId] = useState("");
  const [scope, setScope] = useState<"Full" | "Cycle" | "Spot">("Spot");
  const [productId, setProductId] = useState("");
  const [count, setCount] = useState<StockCountRecord | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [countedQty, setCountedQty] = useState("");

  const open = useMutation({
    mutationFn: () =>
      openStockCount({
        locationId,
        scope,
        productIds: scope === "Spot" && productId ? [productId] : [],
      }),
    onSuccess: (result) => {
      setCount(result.count);
      setEtag(result.etag);
    },
  });

  const saveLines = useMutation({
    mutationFn: () => {
      if (!count?.lines[0]) throw new Error("Open a count first");
      return updateCountLines(
        count.id,
        { lines: [{ lineId: count.lines[0].id, countedQty }] },
        etag,
      );
    },
    onSuccess: (result) => {
      setCount(result.count);
      setEtag(result.etag);
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      if (!count) throw new Error("Open a count first");
      return submitStockCount(count.id, etag);
    },
    onSuccess: (next) => {
      setCount(next);
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
    },
  });

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") => {
      if (!count) throw new Error("Open a count first");
      return action === "approve"
        ? approveStockCount(count.id)
        : rejectStockCount(count.id);
    },
    onSuccess: (next) => {
      setCount(next);
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  if (locations.isPending || products.isPending) {
    return <LoadingState label="Loading count form" />;
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Stock counts">
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
        label="Count scope"
        required
        value={scope}
        options={[
          { value: "Full", label: "Full" },
          { value: "Cycle", label: "Cycle" },
          { value: "Spot", label: "Spot" },
        ]}
        onChange={(event) => {
          setScope(event.target.value as "Full" | "Cycle" | "Spot");
        }}
      />
      {scope === "Spot" ? (
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
      ) : null}
      <Button
        type="button"
        onClick={() => {
          open.mutate();
        }}
      >
        Open count
      </Button>

      {count ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <p>
            {count.scope} count · {count.status}
          </p>
          <ul>
            {count.lines.map((line) => (
              <li key={line.id}>
                Expected {line.expectedQty}
                {line.countedQty != null ? ` · counted ${line.countedQty}` : ""}
                {line.varianceQty !== "0" ? ` · variance ${line.varianceQty}` : ""}
              </li>
            ))}
          </ul>
          <CountScanner
            onScan={(barcode) => {
              const match = (products.data?.items ?? []).find(
                (product) => product.barcode === barcode,
              );
              if (match) setProductId(match.id);
            }}
          />
          <TextField
            label="Counted quantity"
            inputMode="decimal"
            data-barcode-capture=""
            value={countedQty}
            onChange={(event) => {
              setCountedQty(event.target.value);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              saveLines.mutate();
            }}
          >
            Save counted lines
          </Button>
          <Button
            type="button"
            onClick={() => {
              submit.mutate();
            }}
          >
            Submit count
          </Button>
          {count.status === "Submitted" && canApprove ? (
            <span className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  decide.mutate("approve");
                }}
              >
                Approve count
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  decide.mutate("reject");
                }}
              >
                Reject count
              </Button>
            </span>
          ) : null}
        </div>
      ) : null}

      {toProblem(open.error) ? (
        <ProblemSummary problem={toProblem(open.error)} />
      ) : null}
      {toProblem(saveLines.error) ? (
        <ProblemSummary problem={toProblem(saveLines.error)} />
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
