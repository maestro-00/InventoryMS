import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  createReportSchedule,
  deactivateReportSchedule,
  fetchReportSchedules,
} from "../api/reports-api";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function ReportSchedulesPanel() {
  const queryClient = useQueryClient();
  const schedules = useQuery({
    queryKey: ["report-schedules"],
    queryFn: () => fetchReportSchedules(),
  });
  const [reportType, setReportType] = useState("sales");
  const [cadence, setCadence] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [format, setFormat] = useState("csv");
  const [recipients, setRecipients] = useState("owner@kwame.gh");

  const create = useMutation({
    mutationFn: createReportSchedule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
    },
  });
  const deactivate = useMutation({
    mutationFn: deactivateReportSchedule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate({
      reportType,
      cadence,
      format,
      recipients: recipients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  const problem = toProblem(schedules.error ?? create.error ?? deactivate.error);

  return (
    <section aria-label="Report schedules" className="space-y-4">
      <h2>Schedules</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <SelectField
          label="Report type"
          value={reportType}
          options={[
            { value: "sales", label: "Sales" },
            { value: "profit", label: "Profit" },
            { value: "stock", label: "Stock" },
            { value: "tax", label: "Tax" },
          ]}
          onChange={(event) => {
            setReportType(event.target.value);
          }}
        />
        <SelectField
          label="Cadence"
          value={cadence}
          options={[
            { value: "Daily", label: "Daily" },
            { value: "Weekly", label: "Weekly" },
            { value: "Monthly", label: "Monthly" },
          ]}
          onChange={(event) => {
            setCadence(event.target.value as "Daily" | "Weekly" | "Monthly");
          }}
        />
        <SelectField
          label="Format"
          value={format}
          options={[
            { value: "csv", label: "CSV" },
            { value: "pdf", label: "PDF" },
          ]}
          onChange={(event) => {
            setFormat(event.target.value);
          }}
        />
        <TextField
          label="Recipients"
          value={recipients}
          onChange={(event) => {
            setRecipients(event.target.value);
          }}
          hint="Comma-separated emails"
        />
        <Button type="submit">Create schedule</Button>
      </form>
      <ul>
        {(schedules.data?.items ?? []).map((schedule) => (
          <li key={schedule.id} className="flex flex-wrap items-center gap-2">
            <span>
              {schedule.reportType} · {schedule.cadence} · {schedule.format} ·{" "}
              {schedule.isActive ? "Active" : "Inactive"}
            </span>
            {schedule.isActive ? (
              <Button
                type="button"
                onClick={() => {
                  deactivate.mutate(schedule.id);
                }}
              >
                Deactivate
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
