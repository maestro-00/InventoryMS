import { describe, expect, it } from "vitest";
import {
  internalRedirectTarget,
  internalRedirectFromLocation,
  parseInternalRedirect,
} from "./redirect-target";

describe("internalRedirectTarget", () => {
  it("keeps in-app paths, including a query string", () => {
    expect(internalRedirectTarget("/dashboard")).toBe("/dashboard");
    expect(internalRedirectTarget("/reports?kind=sales")).toBe("/reports?kind=sales");
  });

  it("rejects destinations that would leave the application", () => {
    const hostile = [
      "https://evil.example/steal",
      "//evil.example/steal",
      "/\\evil.example",
      "javascript:alert(1)",
      "dashboard",
      "",
      undefined,
    ];
    for (const target of hostile) {
      expect(internalRedirectTarget(target)).toBeNull();
    }
  });

  it("rejects control characters used to smuggle a second header or scheme", () => {
    expect(
      internalRedirectTarget("/dashboard\nLocation: https://evil.example"),
    ).toBeNull();
    expect(internalRedirectTarget("/dash\tboard")).toBeNull();
  });
});

describe("parseInternalRedirect", () => {
  it("splits the saved location into a path and search params", () => {
    expect(parseInternalRedirect("/reports?kind=sales&locationId=abc")).toEqual({
      to: "/reports",
      search: { kind: "sales", locationId: "abc" },
    });
  });

  it("returns an empty search set for a bare path", () => {
    expect(parseInternalRedirect("/dashboard")).toEqual({
      to: "/dashboard",
      search: {},
    });
  });

  it("builds a safe redirect from pathname and search string", () => {
    expect(internalRedirectFromLocation("/reports", "kind=sales")).toBe(
      "/reports?kind=sales",
    );
    expect(internalRedirectFromLocation("/dashboard", "")).toBe("/dashboard");
    expect(internalRedirectFromLocation("/dashboard", "?tab=billing")).toBe(
      "/dashboard?tab=billing",
    );
  });

  it("refuses off-site targets", () => {
    expect(parseInternalRedirect("https://evil.example/steal")).toBeNull();
  });
});
