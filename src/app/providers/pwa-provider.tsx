import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Workbox } from "workbox-window";
import { shouldDeferServiceWorkerUpdate } from "../../shared/db/storage-pressure";

export interface PwaContextValue {
  waiting: boolean;
  deferUpdate: () => void;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function canRegisterServiceWorker(
  env: { DEV: boolean } = import.meta.env,
  nav: { serviceWorker?: unknown } = navigator,
): boolean {
  return !env.DEV && "serviceWorker" in nav;
}

export function registerAppServiceWorker(
  WorkboxImpl: typeof Workbox,
  onWaiting: () => void,
): Workbox {
  const worker = new WorkboxImpl("/service-worker.js");
  worker.addEventListener("waiting", () => {
    onWaiting();
  });
  void worker.register();
  return worker;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [waiting, setWaiting] = useState(false);
  const workerRef = useRef<Workbox | null>(null);

  useEffect(() => {
    if (!canRegisterServiceWorker()) return;
    const worker = registerAppServiceWorker(Workbox, () => {
      setWaiting(true);
    });
    workerRef.current = worker;
    return () => {
      workerRef.current = null;
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      waiting,
      deferUpdate: () => {
        // Mid-shift / pending queue updates stay deferred until idle.
        if (
          shouldDeferServiceWorkerUpdate({
            hasActiveShift: true,
            pendingOfflineSales: 1,
          })
        )
          return;
      },
      applyUpdate: () => {
        const worker = workerRef.current;
        if (!worker) return;
        worker.messageSkipWaiting();
      },
    }),
    [waiting],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const value = useContext(PwaContext);
  if (!value) {
    throw new Error("usePwa must be used within PwaProvider");
  }
  return value;
}
