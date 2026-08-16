import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SessionSnapshot } from "./access-policy";
import {
  sessionManager,
  type SessionManager,
  type SessionStatus,
} from "./session-manager";

export interface SessionContextValue {
  session: SessionSnapshot | null;
  accessToken: string | null;
  status: SessionStatus;
  manager: SessionManager;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  manager = sessionManager,
}: {
  children: ReactNode;
  manager?: SessionManager;
}) {
  const session = useSyncExternalStore(
    (onStoreChange) =>
      manager.subscribe(() => {
        onStoreChange();
      }),
    () => manager.getSnapshot(),
    () => manager.getSnapshot(),
  );
  const accessToken = useSyncExternalStore(
    (onStoreChange) =>
      manager.subscribe(() => {
        onStoreChange();
      }),
    () => manager.getAccessToken(),
    () => manager.getAccessToken(),
  );
  const status = useSyncExternalStore(
    (onStoreChange) =>
      manager.subscribe(() => {
        onStoreChange();
      }),
    () => manager.getStatus(),
    () => manager.getStatus(),
  );
  // Public pages have no guard to await the restore, so start it here to settle `status`.
  useEffect(() => {
    void manager.restore();
  }, [manager]);
  const value = useMemo(
    () => ({ session, accessToken, status, manager }),
    [session, accessToken, status, manager],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
