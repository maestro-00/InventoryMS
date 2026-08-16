/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SERVICE_WORKER = "src/app/service-worker.ts";

describe("service worker policy", () => {
  it("precaches the app shell and keeps authenticated API traffic NetworkOnly", () => {
    const source = readFileSync(SERVICE_WORKER, "utf8");
    expect(source).toContain("precacheAndRoute");
    expect(source).toContain("NetworkOnly");
    expect(source).toMatch(/\/api\//);
    expect(source).not.toMatch(/CacheFirst[\s\S]*\/api\//);
    expect(source).not.toContain("StaleWhileRevalidate");
  });

  it("registers a navigation fallback for the application shell only", () => {
    const source = readFileSync(SERVICE_WORKER, "utf8");
    expect(source).toMatch(/NavigationRoute|createHandlerBoundToURL/);
    expect(source).toMatch(/index\.html/);
  });
});
