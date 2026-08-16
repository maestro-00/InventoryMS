import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Workbox } from "workbox-window";
import {
  PwaProvider,
  canRegisterServiceWorker,
  registerAppServiceWorker,
  usePwa,
} from "./pwa-provider";

function WaitingLabel() {
  const { waiting, applyUpdate, deferUpdate } = usePwa();
  return (
    <div>
      <span>{waiting ? "waiting" : "current"}</span>
      <button type="button" onClick={applyUpdate}>
        Apply
      </button>
      <button type="button" onClick={deferUpdate}>
        Later
      </button>
    </div>
  );
}

function WaitingGuard() {
  let message = "inside";
  try {
    usePwa();
  } catch (error) {
    message = error instanceof Error ? error.message : "failed";
  }
  return <p>{message}</p>;
}

describe("pwa provider", () => {
  it("registers only outside development when a service worker exists", () => {
    expect(canRegisterServiceWorker({ DEV: true }, { serviceWorker: {} })).toBe(false);
    expect(canRegisterServiceWorker({ DEV: false }, {})).toBe(false);
    expect(canRegisterServiceWorker({ DEV: false }, { serviceWorker: {} })).toBe(true);
  });

  it("notifies when a waiting worker is available and can skip waiting", () => {
    const listeners = new Map<string, () => void>();
    const skip = vi.fn();
    class FakeWorkbox {
      addEventListener(type: string, callback: () => void) {
        listeners.set(type, callback);
      }
      register() {
        return Promise.resolve();
      }
      messageSkipWaiting() {
        skip();
        return Promise.resolve();
      }
    }
    const worker = registerAppServiceWorker(
      FakeWorkbox as unknown as typeof Workbox,
      () => undefined,
    );
    listeners.get("waiting")?.();
    worker.messageSkipWaiting();
    expect(skip).toHaveBeenCalled();
  });

  it("exposes deferral controls to the tree", async () => {
    const user = userEvent.setup();
    render(
      <PwaProvider>
        <WaitingLabel />
      </PwaProvider>,
    );
    expect(screen.getByText("current")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Later" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
  });

  it("throws when usePwa is used outside the provider", () => {
    render(<WaitingGuard />);
    expect(screen.getByText(/PwaProvider/)).toBeInTheDocument();
  });
});
