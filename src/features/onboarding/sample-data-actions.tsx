import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../shared/ui/button";
import { LoadingState } from "../../shared/ui/states/ui-state";
import { ProblemSummary, toProblem } from "../../shared/ui/forms/problem-summary";
import { loadSampleData, removeSampleData } from "../tenant/api/tenant-api";
import { useTenant, useTenantQueryKey } from "../tenant/api/tenant-queries";

export function SampleDataActions() {
  const tenantQuery = useTenant();
  const queryClient = useQueryClient();
  const tenantKey = useTenantQueryKey();
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: (action: "load" | "remove") =>
      action === "load" ? loadSampleData() : removeSampleData(),
    onSuccess: () => {
      setConfirming(false);
      void queryClient.invalidateQueries({ queryKey: tenantKey });
    },
  });

  if (tenantQuery.isPending) {
    return <LoadingState label="Loading sample data status" />;
  }

  if (tenantQuery.isError) {
    return <ProblemSummary problem={toProblem(tenantQuery.error)} />;
  }

  const loaded = tenantQuery.data.tenant.sampleDataLoaded;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="sample-data-heading">
      <h2 id="sample-data-heading" className="text-xl font-semibold">
        Sample data
      </h2>
      <p className="text-sm text-muted-foreground">
        Sample records are labelled separately from your real business records.
      </p>

      {mutation.isError ? <ProblemSummary problem={toProblem(mutation.error)} /> : null}

      {loaded ? (
        confirming ? (
          <div
            role="group"
            aria-label="Confirm sample data removal"
            className="flex flex-col gap-2"
          >
            <p>
              Sample records are deleted and real records are kept. This cannot be
              undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => {
                  mutation.mutate("remove");
                }}
              >
                Yes, remove sample data
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Keep sample data
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirming(true);
            }}
          >
            Remove sample data
          </Button>
        )
      ) : (
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate("load");
          }}
        >
          Load sample data
        </Button>
      )}
    </section>
  );
}
