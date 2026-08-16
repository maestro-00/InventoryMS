import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { savePaymentMethod, updateBillingContact } from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function PaymentMethodForm() {
  const [channel, setChannel] = useState<"Card" | "MobileMoney">("MobileMoney");
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const payment = useMutation({ mutationFn: savePaymentMethod });
  const contact = useMutation({ mutationFn: updateBillingContact });
  const problem = toProblem(payment.error ?? contact.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    payment.mutate({ channel, reference });
    if (email) contact.mutate({ billingEmail: email, taxNumber });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={submit}
      noValidate
      aria-label="Payment method"
    >
      <h2>Payment method and billing contact</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <SelectField
        label="Channel"
        value={channel}
        options={[
          { value: "Card", label: "Card" },
          { value: "MobileMoney", label: "Ghana mobile money" },
        ]}
        onChange={(event) => {
          setChannel(event.target.value as "Card" | "MobileMoney");
        }}
      />
      <TextField
        label="Payment reference"
        required
        value={reference}
        onChange={(event) => {
          setReference(event.target.value);
        }}
      />
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
      <Button type="submit" disabled={payment.isPending}>
        Save billing details
      </Button>
    </form>
  );
}
