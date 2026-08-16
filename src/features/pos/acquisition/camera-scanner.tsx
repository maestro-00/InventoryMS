import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

function nativeDetector(): BarcodeDetectorLike | null {
  const Ctor = (globalThis as { BarcodeDetector?: new () => BarcodeDetectorLike })
    .BarcodeDetector;
  return Ctor ? new Ctor() : null;
}

export function CameraScanner({ onScan }: { onScan: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  useEffect(() => {
    if (denied) document.getElementById("typed-barcode")?.focus();
  }, [denied]);

  async function startCamera() {
    setDenied(false);
    const detector = nativeDetector();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setRunning(true);
      if (detector) {
        const found = await detector.detect(
          videoRef.current ?? document.createElement("video"),
        );
        const value = found.find((item) => item.rawValue)?.rawValue;
        if (value) {
          onScan(value);
          stopCamera();
        }
        return;
      }
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeOnceFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
      );
      if (result.getText()) onScan(result.getText());
      stopCamera();
    } catch (error) {
      if (detector) {
        try {
          const found = await detector.detect(document.createElement("video"));
          const value = found.find((item) => item.rawValue)?.rawValue;
          if (value) {
            onScan(value);
            return;
          }
        } catch {
          // Fall through to permission handling.
        }
      }
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "NotFoundError") {
        setDenied(true);
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
    setRunning(false);
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    if (typed.trim() !== "") onScan(typed.trim());
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={() => void startCamera()}>
        Scan with camera
      </Button>
      <video
        ref={videoRef}
        className={running ? "h-40 w-full rounded-md" : "hidden"}
        muted
      />
      {denied ? (
        <form className="flex flex-col gap-2" onSubmit={submitTyped}>
          <p>Camera permission was denied. Type the barcode instead.</p>
          <TextField
            id="typed-barcode"
            label="Type the barcode"
            data-barcode-capture=""
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
          />
          <Button type="submit" variant="outline">
            Add typed barcode
          </Button>
        </form>
      ) : null}
    </div>
  );
}
