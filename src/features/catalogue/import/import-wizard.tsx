import { useMutation } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { PRODUCT_STEP } from "../../onboarding/completion";
import { useMarkOnboardingStep } from "../../onboarding/mark-onboarding-step";
import {
  abandonImport,
  commitImport,
  setImportMapping,
  uploadProductImport,
  type ImportJob,
} from "./api/import-api";

/** Target fields the provider accepts for a product import row. */
const TARGET_FIELDS = [
  { value: "", label: "Ignore this column" },
  { value: "name", label: "Product name" },
  { value: "sku", label: "SKU" },
  { value: "barcode", label: "Barcode" },
  { value: "sellingPrice", label: "Selling price" },
  { value: "costPrice", label: "Cost price" },
  { value: "categoryName", label: "Category" },
  { value: "unitOfMeasure", label: "Unit of measure" },
];

export function ImportWizard({ onCommitted }: { onCommitted?: () => void } = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const markOnboardingStep = useMarkOnboardingStep();

  const upload = useMutation({
    mutationFn: uploadProductImport,
    onSuccess: (uploaded) => {
      setJob(uploaded);
      setMapping(
        Object.fromEntries(uploaded.detectedColumns.map((column) => [column, ""])),
      );
    },
  });
  const preview = useMutation({
    mutationFn: ({
      jobId,
      columns,
    }: {
      jobId: string;
      columns: Record<string, string>;
    }) => setImportMapping(jobId, columns),
    onSuccess: setJob,
  });
  const commit = useMutation({
    mutationFn: (jobId: string) => commitImport(jobId),
    onSuccess: (result) => {
      setJob(result);
      markOnboardingStep(PRODUCT_STEP);
      onCommitted?.();
    },
  });
  const abandon = useMutation({
    mutationFn: abandonImport,
    onSuccess: () => {
      setJob(null);
      setFile(null);
      setMapping({});
    },
  });

  const problem =
    toProblem(upload.error) ??
    toProblem(preview.error) ??
    toProblem(commit.error) ??
    toProblem(abandon.error);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  if (job?.status === "Committed") {
    return (
      <div className="flex flex-col gap-2" role="status">
        <h2 className="text-lg font-semibold">Import finished</h2>
        <p>Created {job.createdCount}</p>
        <p>Updated {job.updatedCount}</p>
        <p>Skipped {job.skippedCount}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!file) {
            setClientErrors(["Choose a CSV or XLSX file to import."]);
            return;
          }
          setClientErrors([]);
          upload.mutate(file);
        }}
        noValidate
      >
        {clientErrors.length > 0 ? (
          <ProblemSummary
            key={clientErrors.join("|")}
            messages={clientErrors}
            title="Choose a file"
          />
        ) : null}
        {problem ? <ProblemSummary problem={problem} /> : null}
        <TextField
          label="Spreadsheet file"
          type="file"
          accept=".csv,.xlsx"
          hint="Nothing is saved until you review the full preview and confirm."
          onChange={chooseFile}
        />
        <Button type="submit" disabled={upload.isPending}>
          Upload and detect columns
        </Button>
      </form>
    );
  }

  const rows = job.preview ?? [];
  const validRows = rows.filter((row) => row.isValid).length;

  return (
    <div className="flex flex-col gap-4">
      {problem ? <ProblemSummary problem={problem} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Detected columns in {job.fileName}</h2>
        {job.detectedColumns.map((column) => (
          <SelectField
            key={column}
            label={`Map "${column}"`}
            options={TARGET_FIELDS}
            value={mapping[column] ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setMapping((current) => ({ ...current, [column]: value }));
            }}
          />
        ))}
        <span className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={preview.isPending}
            onClick={() => {
              preview.mutate({ jobId: job.id, columns: mapping });
            }}
          >
            Preview all rows
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={abandon.isPending}
            onClick={() => {
              abandon.mutate(job.id);
            }}
          >
            Abandon import
          </Button>
        </span>
      </section>

      {rows.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Table aria-label="Import preview">
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowNumber}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell>
                    {Object.entries(row.values)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    {row.isValid ? (
                      "Will be imported"
                    ) : (
                      <ul>
                        {row.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            {validRows} of {rows.length} rows can be imported. Nothing has been saved
            yet.
          </p>
          <Button
            type="button"
            disabled={commit.isPending || validRows === 0}
            onClick={() => {
              commit.mutate(job.id);
            }}
          >
            Commit {validRows} valid {validRows === 1 ? "row" : "rows"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
