import { useEffect } from "react";

/**
 * Phone count entry reuses the wedge buffer but does not ignore focused fields the way
 * the POS till does — count operators type into quantity fields between scans.
 */
export function CountScanner({ onScan }: { onScan: (barcode: string) => void }) {
  useEffect(() => {
    let buffer = "";
    let lastAt = 0;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']") &&
        !target.closest("[data-barcode-capture]")
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastAt > 200) buffer = "";
      lastAt = now;

      if (event.key === "Enter") {
        const barcode = buffer.trim();
        buffer = "";
        if (barcode.length >= 4) onScan(barcode);
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        buffer += event.key;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onScan]);

  return <span className="sr-only">Count scanner ready</span>;
}
