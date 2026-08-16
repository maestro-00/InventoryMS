import { QueryClientProvider } from "@tanstack/react-query";
import { RouterContextProvider } from "@tanstack/react-router";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createAppRouter } from "../../app/router";
import { SessionProvider } from "../auth/session-context";
import type { SessionManager } from "../auth/session-manager";
import {
  createTestQueryClient,
  createTestSessionManager,
  type RenderOptions,
} from "./render";

export interface RenderWithRouterResult extends RenderResult {
  manager: SessionManager;
}

/**
 * Renders a component that links between routes. `RouterContextProvider` supplies the
 * router without mounting matches, so `Link` resolves real destinations while the
 * component under test stays the only thing rendered.
 *
 * Kept apart from `renderWithProviders` because it imports the whole route tree, which is
 * a cost only the tests that need routing should pay.
 */
export function renderWithRouter(
  ui: ReactElement,
  options: RenderOptions = {},
): RenderWithRouterResult {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const manager = createTestSessionManager(options);
  const router = createAppRouter({
    session: manager.getSnapshot(),
    sessionManager: manager,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider manager={manager}>
          <RouterContextProvider router={router}>{children}</RouterContextProvider>
        </SessionProvider>
      </QueryClientProvider>
    );
  }

  return Object.assign(render(ui, { wrapper: Wrapper }), { manager });
}
