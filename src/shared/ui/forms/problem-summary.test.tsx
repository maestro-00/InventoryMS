import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseAppProblem } from "../../api/errors/app-problem";
import { ResponseValidationError } from "../../api/errors/response-validation-error";
import { ProblemSummary, toProblem } from "./problem-summary";

describe("ProblemSummary", () => {
  it("names invalid API response fields instead of hiding the cause", () => {
    const result = z.object({ items: z.array(z.string()) }).safeParse({ items: null });
    if (result.success) throw new Error("Expected invalid fixture");
    const problem = toProblem(
      new ResponseValidationError("Reorder suggestions", result.error.issues),
    );
    render(<ProblemSummary problem={problem} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to display reorder suggestions",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "InventoryX returned unexpected data for items",
    );
  });

  it("identifies a connection failure", () => {
    const problem = toProblem(new TypeError("Failed to fetch"));
    expect(problem).toMatchObject({ title: "Cannot connect to InventoryX" });
  });

  it("labels validation fields and puts the support reference after the next step", () => {
    const problem = parseAppProblem({
      status: 400,
      body: {
        title: "One or more validation errors occurred.",
        errors: { "Payments[0].Amount": ["Tender amounts must be greater than zero."] },
        traceId: "sale-trace",
      },
    });
    render(<ProblemSummary problem={problem} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Check these fields");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Payment amount: Tender amounts must be greater than zero.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("sale-trace");
  });

  it("gives a next step when validation has no field messages", () => {
    const problem = parseAppProblem({
      status: 400,
      body: { title: "One or more validation errors occurred." },
    });
    render(<ProblemSummary problem={problem} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the details and try again.",
    );
  });
});
