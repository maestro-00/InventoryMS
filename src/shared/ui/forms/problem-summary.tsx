import { useEffect, useRef } from "react";
import type { AppProblem } from "../../api/errors/app-problem";
import { isProblemError } from "../../api/errors/problem-error";
import { SupportReference } from "../states/ui-state";

export function toProblem(error: unknown): AppProblem | null {
  if (isProblemError(error)) return error.problem;
  return null;
}

export function problemMessages(problem: AppProblem): string[] {
  const fieldMessages = Object.values(problem.fieldErrors).flat();
  const base =
    fieldMessages.length > 0 ? fieldMessages : problem.detail ? [problem.detail] : [];
  const upgradeHint = problem.extensions["upgradeHint"];
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
  const heading = title ?? problem?.title ?? "This action could not be completed";

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-destructive p-3 text-sm"
    >
      <p className="font-medium">{heading}</p>
      {listed.length > 0 ? (
        <ul className="mt-1 list-disc pl-5">
          {listed.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {problem?.traceId ? <SupportReference traceId={problem.traceId} /> : null}
    </div>
  );
}
