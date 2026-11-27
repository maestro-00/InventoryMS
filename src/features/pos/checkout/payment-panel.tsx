import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
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
import {
  fieldError,
  ProblemSummary,
  toProblem,
} from "../../../shared/ui/forms/problem-summary";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { paymentDifference } from "../cart/sale-preview";
import Decimal from "decimal.js";
import { completeSale, SaleSubmissionGuard } from "./online-checkout";
import {
  completeEligibleOfflineSale,
  type OfflineCompletionResult,
} from "./offline-checkout";
import { completeHeldSale } from "../held-sales/api/held-sales-api";
import { StockValidationError } from "./stock-validation";
import { cartErrors, toSaleLines, type CartState } from "../cart/cart-store";
import { TENDERS, type SaleRecord, type Tender } from "../sales/api/sales-api";

const LIVE_ONLY_TENDERS = new Set<Tender>(["Card"]);

class CartValidationError extends Error {}

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
  previewTotal,
  registerId,
  shiftId,
  tenantId,
  isOnline,
  onValidateStock,
  onPaymentInteraction,
  onCartChange,
  onCompleted,
  onProvisionalCompleted,
}: {
  cart: CartState;
  previewTotal?: string | null;
  registerId: string;
  shiftId: string;
  tenantId: string;
  isOnline: boolean;
  onValidateStock?: () => Promise<void>;
  onPaymentInteraction?: () => void;
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
  const [attempted, setAttempted] = useState(false);
  const [guard] = useState(() => new SaleSubmissionGuard<CheckoutOutcome>());
  void onCartChange;

  const cardBlockedOffline = !isOnline;
  const paid = [cash, card?.amount, ...extras.map((entry) => entry.amount)]
    .filter(
      (amount): amount is string =>
        typeof amount === "string" && /^\d+(?:\.\d+)?$/.test(amount),
    )
    .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
    .toString();
  const difference = paymentDifference(
    previewTotal ?? cart.quote?.grandTotal ?? null,
    paid,
  );
  const missingReferences = [
    ...(card?.amount.trim() && !card.reference.trim()
      ? ["Enter a card reference."]
      : []),
    ...extras
      .filter((entry) => entry.amount.trim() && !entry.reference.trim())
      .map((entry) => `Enter a ${entry.tender} reference.`),
  ];

  const checkout = useMutation({
    mutationFn: async (): Promise<CheckoutOutcome> =>
      guard.run(async (): Promise<CheckoutOutcome> => {
        setOfflineError(null);
        if (cartErrors(cart).length > 0) throw new CartValidationError();
        if (missingReferences.length > 0) throw new CartValidationError();
        if (cart.heldSaleId && difference?.kind === "remaining")
          throw new CartValidationError();
        const payments = [
          ...(cash.trim() === "" ? [] : [{ tender: "Cash" as const, amount: cash }]),
          ...(card
            ? [
                {
                  tender: "Card" as const,
                  amount: card.amount,
                  ...(card.reference.trim()
                    ? { reference: card.reference.trim() }
                    : {}),
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

        await onValidateStock?.();

        if (cart.heldSaleId) {
          return {
            mode: "online",
            result: await completeHeldSale(
              cart.heldSaleId,
              payments,
              cart.quote ? undefined : cart.lines,
            ),
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
      if (
        !isOnline &&
        error instanceof Error &&
        !isProblemError(error) &&
        !(error instanceof CartValidationError) &&
        !(error instanceof z.ZodError)
      ) {
        setOfflineError(error.message);
      }
    },
  });

  function addExtra(tender: ExtraTender["tender"]) {
    onPaymentInteraction?.();
    setExtras((current) =>
      current.some((entry) => entry.tender === tender)
        ? current
        : [...current, { id: crypto.randomUUID(), tender, amount: "", reference: "" }],
    );
  }

  function clearFeedback() {
    onPaymentInteraction?.();
    checkout.reset();
    setOfflineError(null);
    setAttempted(false);
  }

  function extraPaymentIndex(index: number): string {
    return String(
      (cash.trim() ? 1 : 0) +
        (card ? 1 : 0) +
        extras.slice(0, index).filter((row) => row.amount.trim()).length,
    );
  }

  const problem =
    checkout.error instanceof StockValidationError ||
    checkout.error instanceof CartValidationError
      ? null
      : toProblem(checkout.error);
  const currentCartErrors = attempted
    ? [
        ...cartErrors(cart),
        ...missingReferences,
        ...(cart.heldSaleId && difference?.kind === "remaining"
          ? ["Payments do not cover the held sale total."]
          : []),
      ]
    : [];

  return (
    <section className="flex flex-col gap-3" aria-label="Split payment">
      <h2 className="font-semibold">Split payment</h2>
      {problem && !needsAuth && !offlineError ? (
        <ProblemSummary problem={problem} />
      ) : null}
      {offlineError ? (
        <ProblemSummary messages={[offlineError]} title="Offline checkout" />
      ) : null}
      {currentCartErrors.length > 0 ? (
        <ProblemSummary messages={currentCartErrors} title="Check the sale" />
      ) : null}
      {cart.lines.length > 0 &&
      (cash || card?.amount || extras.some((entry) => entry.amount)) &&
      difference ? (
        <p className="rounded-md bg-muted p-3 text-sm" role="status">
          {difference.kind === "change" ? "Change to give" : "Still to pay"}:{" "}
          {formatGhanaMoney(difference.amount)}
        </p>
      ) : null}
      <TextField
        label="Cash amount"
        inputMode="decimal"
        value={cash}
        error={
          cash.trim()
            ? fieldError(problem, "payments.0.amount", "Payments[0].Amount")
            : undefined
        }
        onChange={(event) => {
          setCash(event.target.value);
          clearFeedback();
        }}
      />
      {card ? (
        <div
          className="flex flex-col gap-2 rounded-lg border p-3"
          role="group"
          aria-label="Card tender"
        >
          <TextField
            label="Card amount"
            inputMode="decimal"
            value={card.amount}
            error={fieldError(
              problem,
              `payments.${String(cash.trim() ? 1 : 0)}.amount`,
              `Payments[${String(cash.trim() ? 1 : 0)}].Amount`,
            )}
            disabled={cardBlockedOffline}
            onChange={(event) => {
              const value = event.target.value;
              setCard((current) => (current ? { ...current, amount: value } : current));
              clearFeedback();
            }}
          />
          <TextField
            label="Card reference"
            value={card.reference}
            required={Boolean(card.amount.trim())}
            error={
              attempted && card.amount.trim() && !card.reference.trim()
                ? "Enter a card reference."
                : undefined
            }
            disabled={cardBlockedOffline}
            onChange={(event) => {
              const value = event.target.value;
              setCard((current) =>
                current ? { ...current, reference: value } : current,
              );
              clearFeedback();
            }}
          />
          {cardBlockedOffline ? (
            <p className="text-sm text-muted-foreground" role="status">
              Card authorization is live-only and unavailable while offline.
            </p>
          ) : null}
        </div>
      ) : null}
      {extras.map((entry, index) => (
        <div
          key={entry.id}
          className="flex flex-col gap-2 rounded-lg border p-3"
          role="group"
          aria-label={`${entry.tender} tender`}
        >
          <TextField
            label={`${entry.tender} amount`}
            inputMode="decimal"
            value={entry.amount}
            error={fieldError(
              problem,
              `payments.${extraPaymentIndex(index)}.amount`,
              `Payments[${extraPaymentIndex(index)}].Amount`,
            )}
            onChange={(event) => {
              const value = event.target.value;
              setExtras((current) =>
                current.map((row) =>
                  row.id === entry.id ? { ...row, amount: value } : row,
                ),
              );
              clearFeedback();
            }}
          />
          <TextField
            label={`${entry.tender} reference`}
            value={entry.reference}
            required={Boolean(entry.amount.trim())}
            error={
              attempted && entry.amount.trim() && !entry.reference.trim()
                ? `Enter a ${entry.tender} reference.`
                : undefined
            }
            onChange={(event) => {
              const value = event.target.value;
              setExtras((current) =>
                current.map((row) =>
                  row.id === entry.id ? { ...row, reference: value } : row,
                ),
              );
              clearFeedback();
            }}
          />
        </div>
      ))}
      {!card ? (
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
            onPaymentInteraction?.();
            setCard({ amount: "", reference: "" });
          }}
        >
          Add card tender
        </Button>
      ) : null}
      {TENDERS.filter(
        (tender): tender is ExtraTender["tender"] =>
          tender !== "Cash" &&
          tender !== "Card" &&
          !extras.some((entry) => entry.tender === tender),
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
      <Button
        type="button"
        disabled={checkout.isPending}
        aria-busy={checkout.isPending}
        onClick={() => {
          onPaymentInteraction?.();
          setAttempted(true);
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
              setAttempted(true);
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
