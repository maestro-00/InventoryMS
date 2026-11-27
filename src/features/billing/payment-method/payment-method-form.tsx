import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPaymentIntent,
  fetchMethodVerificationQuote,
  fetchPaymentMethods,
  replacePaymentMethod,
  updateBillingContact,
  usePaymentIntentStatus,
  type BillingPaymentIntent,
  type BillingQuote,
  type MethodReplacement,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";

export function PaymentMethodForm({ quote }: { quote?: BillingQuote }) {
  const [channel, setChannel] = useState<"Card" | "MobileMoney">("MobileMoney");
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<BillingPaymentIntent | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const purchaseKey = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const contact = useMutation({ mutationFn: updateBillingContact });
  const purchase = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("Choose a plan first.");
      purchaseKey.current ??= crypto.randomUUID();
      return createPaymentIntent(
        {
          quoteId: quote.quoteId,
          methodKind: channel === "Card" ? "card" : "mobile_money",
          provider: channel === "Card" ? null : network,
          phoneNumber: channel === "Card" ? null : phone,
        },
        purchaseKey.current,
      );
    },
  });
  const status = usePaymentIntentStatus(intent?.intentId ?? null);
  const problem = toProblem(contact.error ?? purchase.error ?? status.error);

  async function startPurchase(event: FormEvent) {
    event.preventDefault();
    setCheckoutMessage(null);
    if (channel === "MobileMoney" && !/^0\d{9}$/.test(phone)) {
      setCheckoutMessage("Enter a 10-digit Ghana mobile money phone number.");
      return;
    }
    try {
      const started = await purchase.mutateAsync();
      setIntent(started);
      sessionStorage.setItem("billing-payment-intent", started.intentId);
      if (started.authorizationUrl) {
        const url = new URL(started.authorizationUrl);
        if (
          url.protocol !== "https:" ||
          (url.hostname !== "paystack.com" && !url.hostname.endsWith(".paystack.com"))
        ) {
          setCheckoutMessage(
            "The payment provider returned an invalid checkout address. Contact support before retrying.",
          );
          return;
        }
        window.location.assign(url.href);
      }
    } catch {
      // The mutation exposes the provider problem in the form.
    }
  }

  if (quote) {
    const confirmedStatus = status.data?.status ?? intent?.status;
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void startPurchase(event);
        }}
        aria-label="Checkout payment"
      >
        <h3 className="font-semibold">Choose how to pay</h3>
        <p>
          Total due: {quote.currency} {quote.totalAmount.toLocaleString("en-GH")}
        </p>
        {problem ? <ProblemSummary problem={problem} /> : null}
        {checkoutMessage ? <p role="alert">{checkoutMessage}</p> : null}
        <SelectField
          label="Payment channel"
          value={channel}
          options={[
            { value: "Card", label: "Card" },
            { value: "MobileMoney", label: "Ghana mobile money" },
          ]}
          onChange={(event) => {
            setChannel(event.target.value as "Card" | "MobileMoney");
          }}
        />
        {channel === "MobileMoney" ? (
          <>
            <SelectField
              label="Mobile money network"
              value={network}
              options={[
                { value: "mtn", label: "MTN" },
                { value: "telecel", label: "Telecel" },
                { value: "airteltigo", label: "AirtelTigo" },
              ]}
              onChange={(event) => {
                setNetwork(event.target.value);
              }}
            />
            <TextField
              label="Ghana phone number"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
              }}
            />
          </>
        ) : null}
        <Button
          type="submit"
          disabled={
            purchase.isPending ||
            confirmedStatus === "succeeded" ||
            confirmedStatus === "pending" ||
            confirmedStatus === "awaiting_approval"
          }
        >
          {purchase.isPending ? "Starting payment…" : "Start payment"}
        </Button>
        {intent?.approvalMessage ? <p role="status">{intent.approvalMessage}</p> : null}
        {confirmedStatus === "pending" || confirmedStatus === "awaiting_approval" ? (
          <p role="status">
            Waiting for payment confirmation. Keep this page open or return later.
          </p>
        ) : null}
        {confirmedStatus === "succeeded" ? (
          <p role="status">Payment confirmed.</p>
        ) : null}
        {confirmedStatus === "failed" ? (
          <p role="alert">Payment failed. Request a new quote to try again.</p>
        ) : null}
      </form>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (email) contact.mutate({ billingEmail: email, taxNumber });
  }

  return (
    <>
      <MethodReplacementPanel />
      <form
        className="flex flex-col gap-4"
        onSubmit={submit}
        noValidate
        aria-label="Billing contact"
      >
        <h2>Billing contact</h2>
        {problem ? <ProblemSummary problem={problem} /> : null}
        <TextField
          label="Billing email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <TextField
          label="Tax number"
          value={taxNumber}
          onChange={(event) => {
            setTaxNumber(event.target.value);
          }}
        />
        <Button type="submit" disabled={contact.isPending}>
          Save billing details
        </Button>
      </form>
    </>
  );
}

function MethodReplacementPanel() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const tenantId = session?.tenantId ?? "anonymous";
  const permissionRevision = permissionRevisionFor(session);
  const methodKey = useMemo(
    () => scopedQueryKey({ tenantId, permissionRevision, resource: "billing-methods" }),
    [tenantId, permissionRevision],
  );
  const methods = useQuery({
    queryKey: methodKey,
    queryFn: fetchPaymentMethods,
    enabled: Boolean(session?.tenantId),
  });
  const quote = useQuery({
    queryKey: [...methodKey, "quote"],
    queryFn: fetchMethodVerificationQuote,
    enabled: Boolean(session?.tenantId),
  });
  const [channel, setChannel] = useState<"card" | "mobile_money">("mobile_money");
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [started, setStarted] = useState<MethodReplacement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actionKey = useRef<string | null>(null);
  const replacement = useMutation({
    mutationFn: async () => {
      actionKey.current ??= crypto.randomUUID();
      return replacePaymentMethod(
        {
          channel,
          provider: channel === "card" ? null : network,
          msisdn: channel === "card" ? null : phone,
        },
        actionKey.current,
      );
    },
  });
  const status = usePaymentIntentStatus(started?.intentId ?? null);
  useEffect(() => {
    if (status.data?.status === "succeeded")
      void queryClient.invalidateQueries({ queryKey: methodKey });
  }, [status.data?.status, queryClient, methodKey]);
  const problem = toProblem(
    methods.error ?? quote.error ?? replacement.error ?? status.error,
  );
  const active = methods.data?.find(
    (method) => method.status.toLowerCase() === "active",
  );
  const currentStatus = status.data?.status ?? started?.status;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!quote.data) {
      setMessage("The verification price is still loading.");
      return;
    }
    if (channel === "mobile_money" && !/^0\d{9}$/.test(phone)) {
      setMessage("Enter a 10-digit Ghana mobile money phone number.");
      return;
    }
    try {
      const result = await replacement.mutateAsync();
      setStarted(result);
      sessionStorage.setItem("billing-payment-intent", result.intentId);
      if (result.authorizationUrl) {
        const url = new URL(result.authorizationUrl);
        if (
          url.protocol !== "https:" ||
          (url.hostname !== "paystack.com" && !url.hostname.endsWith(".paystack.com"))
        ) {
          setMessage(
            "The payment provider returned an invalid checkout address. Contact support before retrying.",
          );
          return;
        }
        window.location.assign(url.href);
      }
    } catch {
      // The mutation exposes the provider problem above.
    }
  }

  return (
    <section aria-label="Payment method replacement" className="flex flex-col gap-4">
      <h2>Payment method</h2>
      {active ? (
        <p>
          Current method:{" "}
          {active.kind === "card" ? (active.brand ?? "Card") : active.provider}{" "}
          {active.maskedIdentifier}
        </p>
      ) : (
        <p>No verified payment method is active.</p>
      )}
      {quote.data ? (
        <p>
          Verification charge: {quote.data.currency}{" "}
          {quote.data.totalAmount.toLocaleString("en-GH")}
        </p>
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}
      {message ? <p role="alert">{message}</p> : null}
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        className="flex flex-col gap-4"
      >
        <SelectField
          label="Replacement channel"
          value={channel}
          options={[
            { value: "mobile_money", label: "Ghana mobile money" },
            { value: "card", label: "Card" },
          ]}
          onChange={(event) => {
            setChannel(event.target.value as "card" | "mobile_money");
          }}
        />
        {channel === "mobile_money" ? (
          <>
            <SelectField
              label="Replacement network"
              value={network}
              options={[
                { value: "mtn", label: "MTN" },
                { value: "telecel", label: "Telecel" },
                { value: "airteltigo", label: "AirtelTigo" },
              ]}
              onChange={(event) => {
                setNetwork(event.target.value);
              }}
            />
            <TextField
              label="Replacement phone number"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
              }}
            />
          </>
        ) : null}
        <Button
          type="submit"
          disabled={
            replacement.isPending ||
            !quote.data ||
            currentStatus === "pending" ||
            currentStatus === "awaiting_approval" ||
            currentStatus === "succeeded"
          }
        >
          {replacement.isPending
            ? "Starting verification…"
            : "Verify replacement method"}
        </Button>
      </form>
      {started?.approvalMessage ? <p role="status">{started.approvalMessage}</p> : null}
      {currentStatus === "pending" || currentStatus === "awaiting_approval" ? (
        <p role="status">
          Replacement pending. Your current method remains active until verification
          succeeds.
        </p>
      ) : null}
      {currentStatus === "succeeded" ? (
        <p role="status">Replacement confirmed.</p>
      ) : null}
      {currentStatus === "failed" ? (
        <p role="alert">Replacement failed. Your current method remains active.</p>
      ) : null}
    </section>
  );
}
