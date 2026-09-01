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
/* eslint-disable @typescript-eslint/no-unnecessary-condition -- jsdom lacks pointer capture APIs */
const elementPrototype = Element.prototype as Element & {
  hasPointerCapture?: (pointerId: number) => boolean;
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
  scrollIntoView?: Element["scrollIntoView"];
};
if (!elementPrototype.hasPointerCapture) {
  elementPrototype.hasPointerCapture = () => false;
}
if (!elementPrototype.setPointerCapture) {
  elementPrototype.setPointerCapture = () => {};
}
if (!elementPrototype.releasePointerCapture) {
  elementPrototype.releasePointerCapture = () => {};
}
if (!elementPrototype.scrollIntoView) {
  elementPrototype.scrollIntoView = () => {};
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition */

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
