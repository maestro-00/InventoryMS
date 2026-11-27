import { useMutation, useQuery } from "@tanstack/react-query";
import {
  downloadDataExport,
  downloadInvoicePdf,
  fetchInvoicePage,
  startDataExport,
  startRecovery,
  useBillingSubscription,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { formatUtcDateTime } from "../../../shared/utils/date-time";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";

export function InvoiceHistory() {
  const { session } = useSession();
  const [page, setPage] = useState(1);
  const invoices = useQuery({
    queryKey: [
      ...scopedQueryKey({
        tenantId: session?.tenantId ?? "anonymous",
        permissionRevision: permissionRevisionFor(session),
        resource: "billing-invoices",
      }),
      page,
    ],
    queryFn: () => fetchInvoicePage(page),
    enabled: Boolean(session?.tenantId),
  });
  const download = useMutation({ mutationFn: downloadInvoicePdf });
  const problem = toProblem(invoices.error ?? download.error);
  async function saveInvoice(id: string, number: string) {
    try {
      const pdf = await download.mutateAsync(id);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${number}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    } catch {
      // The mutation exposes the download problem above.
    }
  }
  return (
    <section aria-label="Invoices" className="flex flex-col gap-3">
      <h2>Invoices</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <ul>
        {(invoices.data?.items ?? []).map((invoice) => (
          <li key={invoice.id}>
            {invoice.number} · {invoice.status} ·{" "}
            {formatGhanaMoney(invoice.amount, invoice.currency)}
            <Button
              type="button"
              disabled={download.isPending}
              onClick={() => {
                void saveInvoice(invoice.id, invoice.number);
              }}
            >
              Download PDF
            </Button>
          </li>
        ))}
      </ul>
      {invoices.data && invoices.data.totalCount > invoices.data.pageSize ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            Previous
          </Button>
          <span>
            Page {page} of{" "}
            {Math.ceil(invoices.data.totalCount / invoices.data.pageSize)}
          </span>
          <Button
            type="button"
            disabled={page * invoices.data.pageSize >= invoices.data.totalCount}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next
          </Button>
        </div>
      ) : null}
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
    <section aria-label="Data export" className="flex flex-col gap-3">
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
            onClick={() => {
              download.mutate(jobId);
            }}
          >
            {download.isPending ? "Downloading…" : "Download export"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function RecoveryPanel() {
  const subscription = useBillingSubscription();
  const recovery = useMutation({ mutationFn: startRecovery });
  const problem = toProblem(subscription.error ?? recovery.error);
  if (
    subscription.data?.status !== "PastDue" &&
    subscription.data?.status !== "ReadOnly"
  )
    return null;
  return (
    <section
      aria-label="Billing recovery"
      className="flex flex-col gap-3 rounded-lg border border-amber-700 bg-amber-50 p-4"
    >
      <h2>Recover billing</h2>
      <p>
        Outstanding balance:{" "}
        {subscription.data.outstandingAmount ??
          subscription.data.nextRenewalAmount ??
          "the current period"}
        .
        {subscription.data.status === "PastDue" && subscription.data.graceExpiresAt
          ? `Paid actions remain available until ${formatUtcDateTime(subscription.data.graceExpiresAt)}.`
          : "Paid actions are locked until the current period is recovered."}
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <Button
        type="button"
        disabled={recovery.isPending}
        onClick={() => {
          recovery.mutate({ methodKind: "card" });
        }}
      >
        {recovery.isPending ? "Starting recovery…" : "Recover with saved card"}
      </Button>
      {recovery.data?.approvalMessage ? (
        <p role="status">{recovery.data.approvalMessage}</p>
      ) : null}
    </section>
  );
}
