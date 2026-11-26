import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadDataExport, fetchInvoices, startDataExport } from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";
import { formatGhanaMoney } from "../../../shared/money/decimal";

export function InvoiceHistory() {
  const invoices = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: fetchInvoices,
  });
  const problem = toProblem(invoices.error);
  return (
    <section aria-label="Invoices" className="space-y-3">
      <h2>Invoices</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <ul>
        {(invoices.data ?? []).map((invoice) => (
          <li key={invoice.id}>
            {invoice.number} · {invoice.status} ·{" "}
            {formatGhanaMoney(invoice.amount, invoice.currency)}
            <a href={`/api/v1/billing/invoices/${invoice.id}/pdf`}>Download PDF</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DataExportPanel() {
  const [jobId, setJobId] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: startDataExport,
    onSuccess: (result) => {
      setJobId(result.jobId);
    },
  });
  const download = useMutation({ mutationFn: downloadDataExport });
  const problem = toProblem(start.error ?? download.error);

  return (
    <section aria-label="Data export" className="space-y-3">
      <h2>Full data export</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            start.mutate();
          }}
          disabled={start.isPending}
        >
          Start export
        </Button>
        {jobId ? (
          <Button
            type="button"
            disabled={download.isPending}
            onClick={() => download.mutate(jobId)}
          >
            {download.isPending ? "Downloading…" : "Download export"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
