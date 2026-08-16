import type { AppProblem } from "./app-problem";

/**
 * Transport-level failure carrying the normalized RFC 7807 problem. Feature code
 * inspects `problem.kind` instead of the raw status.
 */
export class ProblemError extends Error {
  readonly problem: AppProblem;

  constructor(problem: AppProblem) {
    super(problem.title);
    this.name = "ProblemError";
    this.problem = problem;
  }
}

export function isProblemError(value: unknown): value is ProblemError {
  return value instanceof ProblemError;
}
