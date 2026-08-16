import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("bundle and Lighthouse budget automation", () => {
  it("keeps the check-bundle-budget script aligned with plan.md ceilings", () => {
    const script = readFileSync("scripts/check-bundle-budget.mjs", "utf8");
    expect(script).toContain("INITIAL_JS_BUDGET_KIB = 250");
    expect(script).toContain("INITIAL_TRANSFER_BUDGET_KIB = 500");
    expect(script).toContain("LAZY_CHUNK_BUDGET_KIB = 150");
  });

  it("configures Lighthouse CI for CWV and score floors from plan.md", () => {
    const config = readFileSync("lighthouserc.cjs", "utf8");
    expect(config).toMatch(/categories:performance.*0\.9/);
    expect(config).toMatch(/categories:accessibility.*0\.98/);
    expect(config).toMatch(/categories:best-practices.*0\.95/);
    expect(config).toMatch(/largest-contentful-paint[\s\S]*2500/);
    expect(config).toMatch(/cumulative-layout-shift[\s\S]*0\.1/);
    expect(config).toMatch(/interaction-to-next-paint[\s\S]*200/);
  });
});
