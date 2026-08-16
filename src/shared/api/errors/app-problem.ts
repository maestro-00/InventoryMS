import { z } from "zod";

export const appProblemKindSchema = z.enum([
  "validation",
  "unauthenticated",
  "forbidden",
  "planLimit",
  "readOnly",
  "stale",
  "approvalRequired",
  "rateLimited",
  "transient",
  "notFound",
  "unknown",
]);

export type AppProblemKind = z.infer<typeof appProblemKindSchema>;

export const appProblemSchema = z.object({
  kind: appProblemKindSchema,
  status: z.number().int(),
  title: z.string(),
  detail: z.string().optional(),
  traceId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())),
  extensions: z.record(z.string(), z.unknown()),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});

export type AppProblem = z.infer<typeof appProblemSchema>;

export interface ProblemInput {
  status: number;
  body?: unknown;
  headers?: Headers;
}

const rfc7807Schema = z.looseObject({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  traceId: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
  upgradeHint: z.string().optional(),
  readOnly: z.boolean().optional(),
});

const ALLOWED_EXTENSIONS = new Set([
  "upgradeHint",
  "pendingEntityId",
  "readOnly",
  "limit",
  "current",
]);

function kindForStatus(
  status: number,
  body: z.infer<typeof rfc7807Schema>,
): AppProblemKind {
  if (status === 400) return "validation";
  if (status === 401) return "unauthenticated";
  if (status === 402) {
    if (
      body.readOnly === true ||
      /read-?only/i.test(`${body.title ?? ""} ${body.detail ?? ""}`)
    ) {
      return "readOnly";
    }
    return "planLimit";
  }
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "stale";
  if (status === 423) return "approvalRequired";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "transient";
  return "unknown";
}

function parseRetryAfter(headers: Headers | undefined): number | undefined {
  const raw = headers?.get("Retry-After");
  if (!raw) return undefined;
  const seconds = Number.parseInt(raw, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export function parseAppProblem(input: ProblemInput): AppProblem {
  const parsed = rfc7807Schema.safeParse(input.body ?? {});
  const body = parsed.success ? parsed.data : {};
  const fieldErrors = body.errors ?? {};
  const extensions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_EXTENSIONS.has(key)) {
      extensions[key] = value;
    }
  }

  const problem: AppProblem = {
    kind: kindForStatus(input.status, body),
    status: input.status,
    title: body.title ?? "Request failed",
    fieldErrors,
    extensions,
  };
  if (body.detail !== undefined) problem.detail = body.detail;
  if (body.traceId !== undefined) problem.traceId = body.traceId;
  const retryAfterSeconds = parseRetryAfter(input.headers);
  if (retryAfterSeconds !== undefined) problem.retryAfterSeconds = retryAfterSeconds;
  return appProblemSchema.parse(problem);
}

export function mapFieldErrors(problem: AppProblem): Record<string, string[]> {
  return { ...problem.fieldErrors };
}

export function isRetryableProblem(problem: AppProblem): boolean {
  return problem.kind === "transient" || problem.kind === "rateLimited";
}

export function scrubProblemForTelemetry(problem: AppProblem): {
  kind: AppProblemKind;
  status: number;
  traceId?: string;
} {
  const scrubbed: { kind: AppProblemKind; status: number; traceId?: string } = {
    kind: problem.kind,
    status: problem.status,
  };
  if (problem.traceId) {
    scrubbed.traceId = problem.traceId;
  }
  return scrubbed;
}
