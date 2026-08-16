import type { z } from "zod";
import { parseAppProblem } from "../errors/app-problem";
import { ProblemError } from "../errors/problem-error";

export interface FetchOutcome {
  data?: unknown;
  error?: unknown;
  response: Response;
}

export interface ParsedResource<T> {
  value: T;
  etag: string | undefined;
}

function fail(outcome: FetchOutcome): never {
  throw new ProblemError(
    parseAppProblem({
      status: outcome.response.status,
      body: outcome.error,
      headers: outcome.response.headers,
    }),
  );
}

/** Validates a successful response body at the trust boundary and keeps its ETag. */
export function parseResource<T>(
  outcome: FetchOutcome,
  schema: z.ZodType<T>,
  label: string,
): ParsedResource<T> {
  if (!outcome.response.ok) fail(outcome);
  const result = schema.safeParse(outcome.data);
  if (!result.success) {
    throw new Error(`${label} failed boundary validation`);
  }
  return {
    value: result.data,
    etag: outcome.response.headers.get("ETag") ?? undefined,
  };
}

export function parseValue<T>(
  outcome: FetchOutcome,
  schema: z.ZodType<T>,
  label: string,
): T {
  return parseResource(outcome, schema, label).value;
}

/** Confirms an empty (204) or ignorable success body. */
export function expectSuccess(outcome: FetchOutcome): void {
  if (!outcome.response.ok) fail(outcome);
}
