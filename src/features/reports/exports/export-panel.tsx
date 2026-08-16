import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  pollExportJob,
  startReportExport,
  type ReportFilter,
  type ReportKind,
} from "../api/reports-api";
import { Button } from "../../../shared/ui/button";
import { SelectField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function ReportExportPanel({
  kind,
  filter,
}: {
  kind: ReportKind;
  filter: ReportFilter;
}) {
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [status, setStatus] = useState<string>("Idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setStatus("Starting");
      setDownloadUrl(null);
      const started = await startReportExport(kind, format, filter);
      if (started.status === "Ready") {
        setStatus("Ready");
        return started;
      }
      setStatus("Pending");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const polled = await pollExportJob(started.jobId);
        if (polled.status === "Ready") {
          setStatus("Ready");
          setDownloadUrl(polled.downloadUrl ?? null);
          return started;
        }
        if (polled.status === "Failed") {
          setStatus("Failed");
          throw new Error("Export job failed");
        }
      }
      setStatus("Expired");
      throw new Error("Export job timed out");
    },
  });

  return (
    <section aria-label="Report export" className="space-y-3">
      <h3>Export</h3>
      {toProblem(mutation.error) ? (
        <ProblemSummary problem={toProblem(mutation.error)} />
      ) : null}
      <SelectField
        label="Format"
        value={format}
        options={[
          { value: "csv", label: "CSV" },
          { value: "xlsx", label: "XLSX" },
          { value: "pdf", label: "PDF" },
        ]}
        onChange={(event) => {
          setFormat(event.target.value as "csv" | "xlsx" | "pdf");
        }}
      />
      <Button
        type="button"
        onClick={() => {
          mutation.mutate();
        }}
        disabled={mutation.isPending}
      >
        Start export
      </Button>
      <p role="status">Export status: {status}</p>
      {downloadUrl ? (
        <a href={downloadUrl} download>
          Download export
        </a>
      ) : null}
    </section>
  );
}
