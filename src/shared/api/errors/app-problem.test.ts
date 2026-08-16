import { describe, expect, it } from "vitest";
import { rfc7807Problem } from "../../../../tests/fixtures/domain";
import {
  isRetryableProblem,
  mapFieldErrors,
  parseAppProblem,
  scrubProblemForTelemetry,
  type AppProblem,
  type ProblemInput,
} from "./app-problem";

function problemFor(
  status: number,
  body: Record<string, unknown> = {},
  headers?: Headers,
): AppProblem {
  const input: ProblemInput = {
    status,
    body: {
      type: "https://inventoryx.app/problems/error",
      title: "Request failed",
      status,
      ...body,
    },
  };
  if (headers) input.headers = headers;
  return parseAppProblem(input);
}

describe("AppProblem", () => {
  it("maps the RFC 7807 error matrix to UI kinds", () => {
    expect(problemFor(400).kind).toBe("validation");
    expect(problemFor(401).kind).toBe("unauthenticated");
    expect(problemFor(402).kind).toBe("planLimit");
    expect(problemFor(403).kind).toBe("forbidden");
    expect(problemFor(404).kind).toBe("notFound");
    expect(problemFor(409).kind).toBe("stale");
    expect(problemFor(423).kind).toBe("approvalRequired");
    expect(problemFor(429).kind).toBe("rateLimited");
    expect(problemFor(500).kind).toBe("transient");
    expect(problemFor(502).kind).toBe("transient");
    expect(problemFor(418).kind).toBe("unknown");
  });

  it("treats 402 with a read-only hint as readOnly", () => {
    const problem = problemFor(402, {
      title: "Subscription is read-only",
      detail: "Billing recovery is still available.",
      upgradeHint: "Reactivate to restore writes.",
      readOnly: true,
    });
    expect(problem.kind).toBe("readOnly");
    expect(problem.extensions["upgradeHint"]).toBe("Reactivate to restore writes.");
  });

  it("preserves field errors and a support trace ID", () => {
    const problem = parseAppProblem({
      status: 400,
      body: rfc7807Problem,
    });
    expect(problem.kind).toBe("validation");
    expect(problem.traceId).toBe(rfc7807Problem.traceId);
    expect(mapFieldErrors(problem)).toEqual({
      sku: ["SKU must be unique within the tenant."],
    });
  });

  it("parses Retry-After for rate limits", () => {
    const problem = problemFor(
      429,
      { title: "Too many requests" },
      new Headers({ "Retry-After": "12" }),
    );
    expect(problem.retryAfterSeconds).toBe(12);
  });

  it("parses HTTP-date Retry-After values and ignores invalid headers", () => {
    const later = new Date(Date.now() + 8_000).toUTCString();
    const fromDate = problemFor(
      429,
      { title: "Too many requests" },
      new Headers({ "Retry-After": later }),
    );
    expect(fromDate.retryAfterSeconds).toBeGreaterThanOrEqual(0);
    expect(
      problemFor(
        429,
        { title: "Too many requests" },
        new Headers({ "Retry-After": "soon" }),
      ).retryAfterSeconds,
    ).toBeUndefined();
  });

  it("classifies retryable vs non-retryable problems", () => {
    expect(isRetryableProblem(problemFor(500))).toBe(true);
    expect(isRetryableProblem(problemFor(429))).toBe(true);
    expect(isRetryableProblem(problemFor(409))).toBe(false);
    expect(isRetryableProblem(problemFor(400))).toBe(false);
    expect(isRetryableProblem(problemFor(401))).toBe(false);
  });

  it("scrubs payloads so only the trace ID is telemetered", () => {
    const scrubbed = scrubProblemForTelemetry(
      parseAppProblem({ status: 400, body: rfc7807Problem }),
    );
    expect(scrubbed.traceId).toBe(rfc7807Problem.traceId);
    expect("fieldErrors" in scrubbed).toBe(false);
    expect(JSON.stringify(scrubbed)).not.toContain("SKU");
  });
});
