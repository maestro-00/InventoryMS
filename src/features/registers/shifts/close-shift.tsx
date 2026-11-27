import { useMutation, useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { useState, type FormEvent } from "react";
import { setPosPreparedShiftActive } from "../../pos/pos-location-guard-store";
import { lockRegisterAuth } from "../../../shared/auth/register-auth-store";
import { Button } from "../../../shared/ui/button";
import { useConfirmDialog } from "../../../shared/ui/use-confirm-dialog";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import {
  closeShift,
  fetchZReport,
  zReportQueryKey,
  type CloseShiftResult,
} from "./shifts-api";

export type { CloseShiftResult };

export function CloseShiftForm({
  shiftId,
  onClosed,
}: {
  shiftId: string;
  onClosed?: (result: CloseShiftResult) => void;
}) {
  const [closingCounted, setClosingCounted] = useState("");
  const [attempted, setAttempted] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const report = useQuery({
    queryKey: zReportQueryKey(shiftId),
    queryFn: () => fetchZReport(shiftId),
    refetchInterval: 30_000,
  });
  const validCount = /^\d+(?:\.\d{1,2})?$/.test(closingCounted);
  const projectedVariance =
    validCount && report.data
      ? new Decimal(closingCounted).minus(report.data.expectedCash).toFixed(2)
      : null;
  const mutation = useMutation({
    mutationFn: closeShift,
    onSuccess: async (result) => {
      await lockRegisterAuth({ persistPartition: true });
      setPosPreparedShiftActive(false);
      onClosed?.(result);
    },
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!validCount) return;
    const count = closingCounted;
    confirm({
      title: "Close shift?",
      description: `Confirm closing count ${formatGhanaMoney(count)}? InventoryX will calculate the final variance.`,
      actionLabel: "Close shift",
      onConfirm: () => {
        mutation.mutate({ shiftId, closingCounted: count });
      },
    });
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate aria-label="Close shift">
      <h2>Close shift</h2>
      <p>Count the drawer and review the projected variance before closing.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {mutation.isSuccess ? (
        <p role="status" className="rounded-md border border-accent/40 p-3 text-sm">
          Shift closed ({mutation.data.status}).
        </p>
      ) : null}
      <TextField
        label="Closing counted cash"
        required
        inputMode="decimal"
        value={closingCounted}
        error={
          attempted && !validCount
            ? "Enter a counted cash amount of zero or more."
            : undefined
        }
        onChange={(event) => {
          setClosingCounted(event.target.value);
          setAttempted(false);
        }}
      />
      {report.isPending ? <p>Loading expected cash…</p> : null}
      {report.isError ? (
        <p role="alert">
          Expected cash is unavailable. InventoryX will calculate it when the shift
          closes.
        </p>
      ) : null}
      {report.data ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm [&_dd]:text-right">
          <dt>Cash tendered</dt>
          <dd>{formatGhanaMoney(report.data.cashTendered)}</dd>
          <dt>Expected cash</dt>
          <dd>{formatGhanaMoney(report.data.expectedCash)}</dd>
          {projectedVariance !== null ? (
            <>
              <dt>Projected variance</dt>
              <dd>{formatGhanaMoney(projectedVariance)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
        {mutation.isPending ? "Closing…" : "Close with count"}
      </Button>
      {dialog}
    </form>
  );
}
