import type { z } from "zod";

/** A successful API response whose shape does not match the client contract. */
export class ResponseValidationError extends Error {
  readonly resource: string;
  readonly fields: string[];

  constructor(resource: string, issues: z.core.$ZodIssue[]) {
    super(`${resource} failed boundary validation`);
    this.name = "ResponseValidationError";
    this.resource = resource;
    this.fields = [
      ...new Set(issues.map((issue) => issue.path.join(".") || "response")),
    ];
  }
}
