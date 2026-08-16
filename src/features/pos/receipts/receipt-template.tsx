import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { DenialState, LoadingState } from "../../../shared/ui/states/ui-state";
import {
  fetchReceiptTemplate,
  receiptTemplateSchema,
  saveReceiptTemplate,
  type ReceiptTemplate,
} from "./api/receipts-api";

const TENANT_SETTINGS_ROLES = new Set(["Owner", "Admin"]);

export function ReceiptTemplateSettings() {
  const { session } = useSession();
  const allowed = session ? TENANT_SETTINGS_ROLES.has(session.role) : false;

  const template = useQuery({
    queryKey: ["receipt-template"],
    queryFn: fetchReceiptTemplate,
    enabled: allowed,
  });

  if (!allowed) return <DenialState destination="/dashboard" />;
  if (template.isPending) return <LoadingState label="Loading the receipt template" />;
  if (template.isError) return <ProblemSummary problem={toProblem(template.error)} />;

  return (
    <ReceiptTemplateForm
      initial={template.data.template}
      etag={template.data.etag}
      // Remount on a fresh load so the draft starts from the server's values.
      key={template.dataUpdatedAt}
    />
  );
}

function ReceiptTemplateForm({
  initial,
  etag,
}: {
  initial: ReceiptTemplate;
  etag: string | undefined;
}) {
  const [draft, setDraft] = useState<ReceiptTemplate>(initial);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: (value: ReceiptTemplate) => saveReceiptTemplate(value, etag),
  });

  function update(key: keyof ReceiptTemplate, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const parsed = receiptTemplateSchema.safeParse(draft);
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    save.mutate(parsed.data);
  }

  const problem = toProblem(save.error);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <form className="flex flex-1 flex-col gap-4" onSubmit={submit} noValidate>
        <h1 className="text-2xl font-semibold">Receipt template</h1>
        {clientErrors.length > 0 ? (
          <ProblemSummary
            key={clientErrors.join("|")}
            messages={clientErrors}
            title="Check the receipt details"
          />
        ) : null}
        {problem ? <ProblemSummary problem={problem} /> : null}
        {save.isSuccess ? <p role="status">Receipt template saved.</p> : null}

        <TextField
          label="Business name"
          required
          value={draft.businessName}
          onChange={(event) => {
            update("businessName", event.target.value);
          }}
        />
        <TextField
          label="Logo URL"
          value={draft.logoUrl ?? ""}
          onChange={(event) => {
            update("logoUrl", event.target.value);
          }}
        />
        <TextField
          label="Tax identifier"
          hint="Printed on every receipt for Ghana Revenue Authority checks."
          value={draft.taxIdentifier ?? ""}
          onChange={(event) => {
            update("taxIdentifier", event.target.value);
          }}
        />
        <TextField
          label="Address line"
          value={draft.addressLine ?? ""}
          onChange={(event) => {
            update("addressLine", event.target.value);
          }}
        />
        <TextField
          label="Phone"
          value={draft.phone ?? ""}
          onChange={(event) => {
            update("phone", event.target.value);
          }}
        />
        <TextField
          label="Footer message"
          value={draft.footer ?? ""}
          onChange={(event) => {
            update("footer", event.target.value);
          }}
        />
        <TextField
          label="Return policy"
          value={draft.returnPolicy ?? ""}
          onChange={(event) => {
            update("returnPolicy", event.target.value);
          }}
        />

        <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
          {save.isPending ? "Saving…" : "Save receipt template"}
        </Button>
      </form>

      <section
        aria-label="Receipt preview"
        className="w-full rounded-md border p-4 text-sm lg:w-80"
      >
        <h2 className="font-semibold">{draft.businessName}</h2>
        {draft.addressLine ? <p>{draft.addressLine}</p> : null}
        {draft.phone ? <p>{draft.phone}</p> : null}
        {draft.taxIdentifier ? <p>TIN {draft.taxIdentifier}</p> : null}
        <p>Sample item × 1 — GH₵10.00</p>
        <p>Total GH₵10.00</p>
        {draft.returnPolicy ? <p>{draft.returnPolicy}</p> : null}
        {draft.footer ? <p>{draft.footer}</p> : null}
      </section>
    </div>
  );
}
