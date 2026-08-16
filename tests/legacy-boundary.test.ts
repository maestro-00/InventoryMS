import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bannedPaths = [
  "src/pages",
  "src/components",
  "src/services",
  "src/contexts",
  "src/hooks",
  "src/config",
  "src/lib",
  "src/App.tsx",
  "src/index.css",
  "OAUTH_FLOW.md",
  "FORGOT_PASSWORD_FLOW.md",
  "TWO_FACTOR_AUTH_FLOW.md",
] as const;

describe("legacy boundary", () => {
  it("boots only through the InventoryX app shell", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toContain("app-providers");
    expect(main).not.toContain('from "./App.tsx"');
    expect(main).not.toContain("AuthContext");
    expect(main).not.toContain("react-router-dom");
  });

  it("has deleted the prototype route/auth/API layers", () => {
    for (const path of bannedPaths) {
      expect(existsSync(path), `${path} must be removed`).toBe(false);
    }
  });

  it("does not declare Supabase or legacy package-manager lockfiles", () => {
    const pkg = readFileSync("package.json", "utf8");
    expect(pkg).not.toMatch(/@supabase\/supabase-js/);
    expect(pkg).not.toMatch(/react-router-dom/);
    expect(pkg).not.toMatch(/lovable-tagger/);
    expect(existsSync("package-lock.json")).toBe(false);
    expect(existsSync("bun.lockb")).toBe(false);
    expect(existsSync("pnpm-lock.yaml")).toBe(true);
  });
});
