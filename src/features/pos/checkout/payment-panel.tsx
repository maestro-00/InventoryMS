import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { isProblemError } from "../../../shared/api/errors/problem-error";
import {
  isRegisterUnlocked,
  isRegisterUnlockedForShift,
} from "../../../shared/auth/register-auth-store";
import { Button } from "../../../shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../shared/ui/dialog";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { completeSale, SaleSubmissionGuard } from "./online-checkout";
import {
  completeEligibleOfflineSale,
  type OfflineCompletionResult,
} from "./offline-checkout";
import { completeHeldSale } from "../held-sales/api/held-sales-api";
import { toSaleLines, type CartState } from "../cart/cart-store";
import { TENDERS, type SaleRecord, type Tender } from "../sales/api/sales-api";

const LIVE_ONLY_TENDERS = new Set<Tender>(["Card"]);

type ExtraTender = {
  id: string;
  tender: Exclude<Tender, "Cash" | "Card">;
  amount: string;
  reference: string;
};

type CheckoutOutcome =
  | { mode: "offline"; result: OfflineCompletionResult }
  | { mode: "online"; result: SaleRecord };

export function PaymentPanel({
  cart,
  registerId,
  shiftId,
  tenantId,
  isOnline,
  onCartChange,
  onCompleted,
  onProvisionalCompleted,
}: {
  cart: CartState;
  registerId: string;
  shiftId: string;
  tenantId: string;
  isOnline: boolean;
  onCartChange: (cart: CartState) => void;
  onCompleted: (sale: SaleRecord) => void;
  onProvisionalCompleted: (result: OfflineCompletionResult) => void;
}) {
  const [cash, setCash] = useState("");
  const [card, setCard] = useState<{ amount: string; reference: string } | null>(null);
  const [extras, setExtras] = useState<ExtraTender[]>([]);
  const [authorizer, setAuthorizer] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [guard] = useState(() => new SaleSubmissionGuard<CheckoutOutcome>());
  void onCartChange;

  const totals = cart.quote;
  const cardBlockedOffline = !isOnline;

  const checkout = useMutation({
    mutationFn: async (): Promise<CheckoutOutcome> =>
      guard.run(async (): Promise<CheckoutOutcome> => {
        setOfflineError(null);
        const payments = [
          ...(cash.trim() === "" ? [] : [{ tender: "Cash" as const, amount: cash }]),
          ...(card
            ? [
                {
                  tender: "Card" as const,
                  amount: card.amount,
                  ...(card.reference ? { reference: card.reference } : {}),
                },
              ]
            : []),
          ...extras
            .filter((entry) => entry.amount.trim() !== "")
            .map((entry) => ({
              tender: entry.tender,
              amount: entry.amount,
              ...(entry.reference.trim() ? { reference: entry.reference.trim() } : {}),
            })),
        ];

        if (!isOnline) {
          if (payments.some((payment) => LIVE_ONLY_TENDERS.has(payment.tender))) {
            throw new Error(
              "Card authorization is live-only and unavailable while offline.",
            );
          }
          const unlocked = shiftId
            ? isRegisterUnlockedForShift(tenantId, registerId, shiftId)
            : isRegisterUnlocked(tenantId, registerId);
          if (!unlocked) {
            throw new Error(
              "Unlock the till with your register PIN before completing offline sales.",
            );
          }
          return {
            mode: "offline",
            result: await completeEligibleOfflineSale({
              tenantId,
              registerId,
              shiftId,
              cart,
              payments,
            }),
          };
        }

        if (cart.heldSaleId) {
          return {
            mode: "online",
            result: await completeHeldSale(cart.heldSaleId, payments),
          };
        }
        return {
          mode: "online",
          result: await completeSale({
            clientSaleId: cart.clientSaleId,
            registerId,
            shiftId,
            lines: toSaleLines(cart).map((line) =>
              authorizer ? { ...line, discountAuthorizedBy: authorizer } : line,
            ),
            payments,
          }),
        };
      }),
    onSuccess: (outcome) => {
      setNeedsAuth(false);
      if (outcome.mode === "offline") {
        onProvisionalCompleted(outcome.result);
        return;
      }
      onCompleted(outcome.result);
    },
    onError: (error) => {
      if (isProblemError(error) && error.problem.kind === "approvalRequired") {
        setNeedsAuth(true);
        return;
      }
      if (error instanceof Error && !isProblemError(error)) {
        setOfflineError(error.message);
      }
    },
  });

  function addExtra(tender: ExtraTender["tender"]) {
    setExtras((current) => [
      ...current,
      { id: crypto.randomUUID(), tender, amount: "", reference: "" },
    ]);
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Split payment">
      {totals ? (
        <dl className="grid grid-cols-2 gap-1">
          <dt>Subtotal</dt>
          <dd>{formatGhanaMoney(totals.subtotal)}</dd>
          <dt>Tax</dt>
          <dd>{formatGhanaMoney(totals.taxTotal)}</dd>
          <dt>Total</dt>
          <dd>{formatGhanaMoney(totals.grandTotal)}</dd>
        </dl>
      ) : (
        <p>
          {isOnline
            ? "Totals are calculated by InventoryX when the sale is submitted."
            : "Provisional totals use the catalog price until sync confirms the final receipt."}
        </p>
      )}
      {toProblem(checkout.error) && !needsAuth ? (
        <ProblemSummary problem={toProblem(checkout.error)} />
      ) : null}
      {offlineError ? (
        <ProblemSummary messages={[offlineError]} title="Offline checkout" />
      ) : null}
      <TextField
        label="Cash amount"
        inputMode="decimal"
        value={cash}
        onChange={(event) => {
          setCash(event.target.value);
        }}
      />
      {card ? (
        <>
          <TextField
            label="Card amount"
            inputMode="decimal"
            value={card.amount}
            disabled={cardBlockedOffline}
            onChange={(event) => {
              const value = event.target.value;
              setCard((current) => (current ? { ...current, amount: value } : current));
            }}
          />
          <TextField
            label="Card reference"
            value={card.reference}
            disabled={cardBlockedOffline}
            onChange={(event) => {
              const value = event.target.value;
              setCard((current) =>
                current ? { ...current, reference: value } : current,
              );
            }}
          />
          {cardBlockedOffline ? (
            <p className="text-sm text-muted-foreground" role="status">
              Card authorization is live-only and unavailable while offline.
            </p>
          ) : null}
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={cardBlockedOffline}
          title={
            cardBlockedOffline
              ? "Card authorization is live-only and unavailable while offline."
              : undefined
          }
          onClick={() => {
            setCard({ amount: "", reference: "" });
          }}
        >
          Add card tender
        </Button>
      )}
      {TENDERS.filter(
        (tender): tender is ExtraTender["tender"] =>
          tender !== "Cash" && tender !== "Card",
      ).map((tender) => (
        <Button
          key={tender}
          type="button"
          variant="outline"
          onClick={() => {
            addExtra(tender);
          }}
        >
          Add {tender} tender
        </Button>
      ))}
      {extras.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-2">
          <TextField
            label={`${entry.tender} amount`}
            inputMode="decimal"
            value={entry.amount}
            onChange={(event) => {
              const value = event.target.value;
              setExtras((current) =>
                current.map((row) =>
                  row.id === entry.id ? { ...row, amount: value } : row,
                ),
              );
            }}
          />
          <TextField
            label={`${entry.tender} reference`}
            value={entry.reference}
            onChange={(event) => {
              const value = event.target.value;
              setExtras((current) =>
                current.map((row) =>
                  row.id === entry.id ? { ...row, reference: value } : row,
                ),
              );
            }}
          />
        </div>
      ))}
      <Button
        type="button"
        disabled={checkout.isPending}
        aria-busy={checkout.isPending}
        onClick={() => {
          checkout.mutate();
        }}
      >
        {isOnline ? "Take split payment" : "Complete offline sale"}
      </Button>

      <Dialog open={needsAuth} onOpenChange={setNeedsAuth}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manager authorization</DialogTitle>
            <DialogDescription>
              This discount or refund is above the cashier cap. Enter the authorizing
              manager, then retry.
            </DialogDescription>
          </DialogHeader>
          <TextField
            label="Authorizing manager"
            value={authorizer}
            onChange={(event) => {
              setAuthorizer(event.target.value);
            }}
          />
          <Button
            type="button"
            onClick={() => {
              checkout.mutate();
            }}
          >
            Retry with authorization
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
