import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/alert";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { deliverReceipt } from "./api/receipts-api";

export function ReceiptDelivery({ saleId }: { saleId: string }) {
  const [email, setEmail] = useState("");
  const [sms, setSms] = useState("");
  const emailSend = useMutation({
    mutationFn: () => deliverReceipt(saleId, { channel: "Email", destination: email }),
  });
  const smsSend = useMutation({
    mutationFn: () => deliverReceipt(saleId, { channel: "Sms", destination: sms }),
  });

  return (
    <section className="flex flex-col gap-3" aria-label="Receipt delivery">
      <TextField
        label="Email address"
        type="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          emailSend.mutate();
        }}
      >
        Send email
      </Button>
      {emailSend.data?.success ? (
        <Alert role="status" variant="success">
          <AlertTitle>Email queued</AlertTitle>
          <AlertDescription>
            The receipt is queued for delivery to {emailSend.data.destination}.
          </AlertDescription>
        </Alert>
      ) : null}
      {emailSend.data && !emailSend.data.success ? (
        <ProblemSummary
          title="Email was not queued"
          messages={[
            emailSend.data.message ?? "Check the email address and try again.",
          ]}
        />
      ) : null}

      <TextField
        label="SMS number"
        value={sms}
        onChange={(event) => {
          setSms(event.target.value);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          smsSend.mutate();
        }}
      >
        Send SMS
      </Button>
      {smsSend.data && !smsSend.data.success ? (
        <ProblemSummary
          title="SMS was not queued"
          messages={[smsSend.data.message ?? "Check the phone number and try again."]}
        />
      ) : null}
      {smsSend.data?.success ? (
        <Alert role="status" variant="success">
          <AlertTitle>SMS queued</AlertTitle>
          <AlertDescription>
            The receipt is queued for delivery to {smsSend.data.destination}.
          </AlertDescription>
        </Alert>
      ) : null}
      {toProblem(emailSend.error) ? (
        <ProblemSummary problem={toProblem(emailSend.error)} />
      ) : null}
      {toProblem(smsSend.error) ? (
        <ProblemSummary problem={toProblem(smsSend.error)} />
      ) : null}
    </section>
  );
}
