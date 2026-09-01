import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { server } from "./msw/server";

Object.defineProperty(globalThis, "indexedDB", {
  value: indexedDB,
  configurable: true,
});
Object.defineProperty(globalThis, "IDBKeyRange", {
  value: IDBKeyRange,
  configurable: true,
});

// Radix Select uses pointer capture APIs that jsdom does not implement.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// The first mocked request in a file pays the MSW/jsdom warm-up cost, which exceeds the
// 1s default on slower machines and in parallel workers.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
