import { useCallback, useEffect, useState } from "react";

/**
 * Live connectivity from the browser network status. Updates without remounting
 * the active sale so FR-041 status can refresh in the shell.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const onOnline = useCallback(() => {
    setIsOnline(true);
  }, []);
  const onOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [onOnline, onOffline]);

  return isOnline;
}
