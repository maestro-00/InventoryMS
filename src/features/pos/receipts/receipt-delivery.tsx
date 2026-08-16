import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
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
      {emailSend.data?.success ? <p role="status">Email queued</p> : null}
      {emailSend.data && !emailSend.data.success ? (
        <p role="status">{emailSend.data.message}</p>
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
        <p role="status">{smsSend.data.message}</p>
      ) : null}
      {smsSend.data?.success ? <p role="status">SMS queued</p> : null}
      {toProblem(emailSend.error) ? (
        <ProblemSummary problem={toProblem(emailSend.error)} />
      ) : null}
      {toProblem(smsSend.error) ? (
        <ProblemSummary problem={toProblem(smsSend.error)} />
      ) : null}
    </section>
  );
}
