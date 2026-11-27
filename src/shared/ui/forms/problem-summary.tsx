import { useEffect, useRef } from "react";
import { z } from "zod";
import type { AppProblem } from "../../api/errors/app-problem";
import { isProblemError } from "../../api/errors/problem-error";
import { ResponseValidationError } from "../../api/errors/response-validation-error";
import { Alert, AlertDescription, AlertTitle } from "../alert";
import { SupportReference } from "../states/ui-state";

export function toProblem(error: unknown): AppProblem | null {
  if (isProblemError(error)) return error.problem;
  if (error instanceof ResponseValidationError) {
    return {
      kind: "transient",
      status: 0,
      title: `Unable to display ${error.resource.toLowerCase()}`,
      detail: `InventoryX returned unexpected data${error.fields.length ? ` for ${error.fields.join(", ")}` : ""}. Refresh the page. If this persists, contact support.`,
      fieldErrors: {},
      extensions: {},
    };
  }
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join(".") || "form";
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return {
      kind: "validation",
      status: 400,
      title: "Check your entries",
      fieldErrors,
      extensions: {},
    };
  }
  if (error instanceof Error) {
    const connectionFailed =
      error instanceof TypeError && /fetch|network/i.test(error.message);
    return {
      kind: "transient",
      status: 0,
      title: connectionFailed
        ? "Cannot connect to InventoryX"
        : "This action could not be completed",
      detail: connectionFailed
        ? "Check your connection and that InventoryX is running, then try again."
        : "Try again. If it keeps happening, contact support.",
      fieldErrors: {},
      extensions: {},
    };
  }
  return null;
}

export function fieldError(
  problem: AppProblem | null,
  ...fields: string[]
): string | undefined {
  if (!problem) return undefined;
  const entry = Object.entries(problem.fieldErrors).find(([key]) =>
    fields.some((field) => key.toLowerCase() === field.toLowerCase()),
  );
  return entry?.[1].join(" ");
}

function labelForField(field: string): string {
  if (!field.trim()) return "Form";
  const terminal = field.split(".").at(-1) ?? field;
  const label = terminal.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
  if (/^payments(?:\[\d+\]|\.\d+)\.amount$/i.test(field)) return "Payment amount";
  if (/^lines(?:\[\d+\]|\.\d+)\.qty$/i.test(field)) return "Quantity";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function problemMessages(problem: AppProblem): string[] {
  const fieldMessages = Object.entries(problem.fieldErrors).flatMap(([field, errors]) =>
    errors.map((message) => `${labelForField(field)}: ${message}`),
  );
  const base = [...fieldMessages];
  if (problem.detail && problem.detail !== problem.title) base.push(problem.detail);
  const upgradeHint = problem.extensions["upgradeHint"];
  if (base.length === 0) {
    const fallback: Partial<Record<AppProblem["kind"], string>> = {
      validation:
        "Check the details and try again. If the problem continues, contact support.",
      unauthenticated: "Sign in again, then retry this action.",
      forbidden: "Ask an administrator for access to this action.",
      planLimit:
        "This action is unavailable on the current plan. Review your plan to continue.",
      readOnly: "This account is read-only. Restore write access to continue.",
      stale: "Review the latest information, then try again.",
      approvalRequired: "This action needs approval before it can continue.",
      notFound: "The requested item was not found. Refresh the page and try again.",
      rateLimited: "Wait a moment before trying again.",
      transient: "Try again. If the problem continues, contact support.",
      unknown: "Try again. If the problem continues, contact support.",
    };
    const message = fallback[problem.kind];
    if (message) base.push(message);
  }
  if (problem.kind === "rateLimited" && problem.retryAfterSeconds !== undefined) {
    base.push(`Try again in ${String(problem.retryAfterSeconds)} seconds.`);
  }
  return typeof upgradeHint === "string" ? [...base, upgradeHint] : base;
}

/**
 * Assertive summary for a blocked submission. Focus moves here on appearance so a
 * keyboard or screen-reader user is told why the action stopped.
 */
export function ProblemSummary({
  problem,
  messages,
  title,
}: {
  problem?: AppProblem | null;
  messages?: string[];
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listed = messages ?? (problem ? problemMessages(problem) : []);
  const heading =
    title ??
    (problem?.kind === "validation"
      ? Object.keys(problem.fieldErrors).length > 0
        ? "Check these fields"
        : "Check your entries"
      : (problem?.title ?? "This action could not be completed"));

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Alert ref={ref} variant="destructive" tabIndex={-1}>
      <AlertTitle>{heading}</AlertTitle>
      <AlertDescription>
        {listed.length > 0 ? (
          <ul className="list-disc pl-5">
            {listed.map((message, index) => (
              <li key={`${String(index)}-${message}`}>{message}</li>
            ))}
          </ul>
        ) : null}
        {problem?.traceId ? (
          <div className="mt-2 text-xs text-muted-foreground">
            <SupportReference traceId={problem.traceId} />
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
