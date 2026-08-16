import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headers = readFileSync("public/_headers", "utf8");
const securityPolicy = readFileSync("SECURITY.md", "utf8");

describe("security headers deployment template", () => {
  it("publishes a strict CSP with Trusted Types and camera-self policy", () => {
    expect(headers).toMatch(/Content-Security-Policy:/);
    expect(headers).toMatch(/default-src 'self'/);
    expect(headers).toMatch(/object-src 'none'/);
    expect(headers).toMatch(/frame-ancestors 'none'/);
    expect(headers).toMatch(/require-trusted-types-for 'script'/);
    expect(headers).toMatch(/trusted-types default inventoryms/);
    expect(headers).toMatch(/Permissions-Policy:.*camera=\(self\)/);
    expect(headers).toMatch(/X-Content-Type-Options: nosniff/);
    expect(headers).toMatch(/X-Frame-Options: DENY/);
    expect(headers).toMatch(/Strict-Transport-Security:/);
    expect(headers).not.toMatch(/unsafe-eval/);
    expect(headers).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("documents the same controls in SECURITY.md", () => {
    expect(securityPolicy).toMatch(/Content-Security-Policy/i);
    expect(securityPolicy).toMatch(/Trusted Types/i);
    expect(securityPolicy).toMatch(/camera=\(self\)/i);
    expect(securityPolicy).toMatch(/public\/_headers/);
  });
});
