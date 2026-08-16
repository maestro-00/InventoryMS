import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { hasPermission } from "../../../shared/auth/access-policy";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import {
  correctMovement,
  fetchStockMovements,
  type StockMovementRecord,
} from "../stock/api/stock-api";

export function MovementsPanel({ locationId }: { locationId?: string }) {
  const { session } = useSession();
  const canCorrect = hasPermission(session, "ManageStock");
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<StockMovementRecord | null>(null);
  const [correctedQty, setCorrectedQty] = useState("");
  const [note, setNote] = useState("");

  const movements = useQuery({
    queryKey: ["stock-movements", locationId, type],
    queryFn: () =>
      fetchStockMovements({
        ...(locationId ? { locationId } : {}),
        ...(type ? { type } : {}),
        pageSize: 100,
      }),
  });

  const correct = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a movement");
      return correctMovement(selected.id, {
        correctedQtyDelta: correctedQty,
        reasonCode: "Correction",
        ...(note ? { note } : {}),
      });
    },
    onSuccess: () => {
      setSelected(null);
      setCorrectedQty("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
    },
  });

  if (movements.isPending) return <LoadingState label="Loading movements" />;
  if (movements.isError) return <ProblemSummary problem={toProblem(movements.error)} />;

  return (
    <section className="flex flex-col gap-4" aria-label="Stock movements">
      <label className="flex flex-col gap-1 text-sm">
        Movement type
        <select
          className="h-10 rounded-md border px-3"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
          }}
        >
          <option value="">All types</option>
          <option value="Adjustment">Adjustment</option>
          <option value="TransferOut">TransferOut</option>
          <option value="TransferIn">TransferIn</option>
          <option value="Count">Count</option>
        </select>
      </label>
      <ul className="flex flex-col gap-2">
        {movements.data.items.map((movement) => (
          <li
            key={movement.id}
            className="flex flex-col gap-1 border-b py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p>
                {movement.type} · {movement.qtyDelta}
                {movement.reasonCode ? ` · ${movement.reasonCode}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {movement.occurredAt}
                {movement.correlationId
                  ? ` · corrects ${movement.correlationId}`
                  : " · original ledger entry"}
              </p>
            </div>
            {canCorrect ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected(movement);
                  setCorrectedQty(movement.qtyDelta);
                }}
              >
                Correct movement
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {selected ? (
        <form
          className="flex flex-col gap-2 rounded-md border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            correct.mutate();
          }}
        >
          <p>
            Correcting movement {selected.id}. The original entry stays in the ledger.
          </p>
          <TextField
            label="Corrected quantity delta"
            value={correctedQty}
            onChange={(event) => {
              setCorrectedQty(event.target.value);
            }}
          />
          <TextField
            label="Correction note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
          {toProblem(correct.error) ? (
            <ProblemSummary problem={toProblem(correct.error)} />
          ) : null}
          <Button type="submit">Save correction</Button>
        </form>
      ) : null}
    </section>
  );
}
