import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchExportJob, fetchInvoices, startDataExport } from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";

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
            {invoice.number} · {invoice.status} · {String(invoice.total)}
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
  const job = useQuery({
    queryKey: ["billing", "export", jobId],
    queryFn: () => {
      if (!jobId) throw new Error("Export job id is required");
      return fetchExportJob(jobId);
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "Completed" ? false : 1500,
  });
  const problem = toProblem(start.error ?? job.error);

  return (
    <section aria-label="Data export" className="space-y-3">
      <h2>Full data export</h2>
      <p>
        Export is available even in read-only recovery so you are never held hostage.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <Button
        type="button"
        onClick={() => {
          start.mutate();
        }}
        disabled={start.isPending}
      >
        Start export
      </Button>
      {job.data ? <p>Status: {job.data.status}</p> : null}
      {job.data?.downloadUrl ? (
        <a href={job.data.downloadUrl}>Download export</a>
      ) : null}
    </section>
  );
}
