import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { SessionSnapshot } from "../shared/auth/access-policy";
import type { SessionManager } from "../shared/auth/session-manager";
import { RouteErrorBoundary } from "../app/providers/error-boundary";

export interface RouterContext {
  /** Last rendered snapshot. Guards read the manager instead; see `_authenticated`. */
  session: SessionSnapshot | null;
  /**
   * Guards resolve the session through the manager so `beforeLoad` sees the session that
   * exists now, not the one React has finished rendering.
   */
  sessionManager: SessionManager;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <RouteErrorBoundary>
      <Outlet />
    </RouteErrorBoundary>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="p-6">
      <h1>Page not found</h1>
    </main>
  );
}
