import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const decodeOnceFromVideoDevice = vi.fn(() =>
  Promise.resolve({ getText: () => "ZXING-99" }),
);

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeOnceFromVideoDevice = decodeOnceFromVideoDevice;
  },
}));

import { CameraScanner } from "./camera-scanner";

describe("camera scanner", () => {
  beforeEach(() => {
    decodeOnceFromVideoDevice.mockClear();
    Reflect.deleteProperty(globalThis, "BarcodeDetector");
  });

  it("falls back to typed barcode entry when camera is denied", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => {
          const error = new Error("denied");
          error.name = "NotAllowedError";
          return Promise.reject(error);
        }),
      },
    });
    render(<CameraScanner onScan={onScan} />);
    await user.click(screen.getByRole("button", { name: /scan with camera/i }));
    expect(
      await screen.findByText(/camera permission was denied/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/type the barcode/i), "6001999");
    await user.click(screen.getByRole("button", { name: /add typed barcode/i }));
    expect(onScan).toHaveBeenCalledWith("6001999");
    await user.clear(screen.getByLabelText(/type the barcode/i));
    await user.click(screen.getByRole("button", { name: /add typed barcode/i }));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("uses native BarcodeDetector when available", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    const trackStop = vi.fn();
    Object.defineProperty(globalThis, "BarcodeDetector", {
      configurable: true,
      value: class {
        detect = vi.fn(() => Promise.resolve([{ rawValue: "6001111" }]));
      },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() =>
          Promise.resolve({
            getTracks: () => [{ stop: trackStop }],
          }),
        ),
      },
    });
    render(<CameraScanner onScan={onScan} />);
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    await user.click(screen.getByRole("button", { name: /scan with camera/i }));
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("6001111");
    });
    expect(trackStop).toHaveBeenCalled();
  });

  it("falls back to ZXing when BarcodeDetector is unavailable", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() =>
          Promise.resolve({
            getTracks: () => [{ stop: vi.fn() }],
          }),
        ),
      },
    });
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    render(<CameraScanner onScan={onScan} />);
    await user.click(screen.getByRole("button", { name: /scan with camera/i }));
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("ZXING-99");
    });
    expect(decodeOnceFromVideoDevice).toHaveBeenCalled();
  });

  it("uses detector fallback when getUserMedia fails but detector finds a code", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    Object.defineProperty(globalThis, "BarcodeDetector", {
      configurable: true,
      value: class {
        detect = vi.fn(() => Promise.resolve([{ rawValue: "FALLBACK-1" }]));
      },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => Promise.reject(new Error("busy"))),
      },
    });
    render(<CameraScanner onScan={onScan} />);
    await user.click(screen.getByRole("button", { name: /scan with camera/i }));
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("FALLBACK-1");
    });
  });
});
