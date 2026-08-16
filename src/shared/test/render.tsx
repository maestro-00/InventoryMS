import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { SessionProvider } from "../auth/session-context";
import { SessionManager, type SessionRecord } from "../auth/session-manager";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export const ownerSessionRecord: SessionRecord = {
  userId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  role: "Owner",
  permissions: [
    "Sell",
    "Refund",
    "Discount",
    "VoidSale",
    "ManageStock",
    "ManagePricing",
    "ViewReports",
    "ViewProfit",
    "ManageUsers",
    "ApproveAdjustments",
  ],
  locationScope: ["33333333-3333-4333-8333-333333333333"],
  expiresAt: "2026-08-13T12:00:00.000Z",
  accessToken: "test-access",
  refreshToken: "test-refresh",
};

export interface RenderOptions {
  session?: SessionRecord | null;
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
  manager: SessionManager;
}

/**
 * Renders a feature component inside the query and session providers used at runtime.
 *
 * There is deliberately no router here: pulling the route tree into every component test
 * doubled the suite. Use `renderWithRouter` from `./render-router` for a component that
 * renders a `Link`, which otherwise fails on the missing router context.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions = {},
): RenderWithProvidersResult {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const manager = createTestSessionManager(options);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider manager={manager}>{children}</SessionProvider>
      </QueryClientProvider>
    );
  }

  return Object.assign(render(ui, { wrapper: Wrapper }), { queryClient, manager });
}

/** Shared setup so both harnesses start from the same session lifecycle. */
export function createTestSessionManager(options: RenderOptions): SessionManager {
  const manager = new SessionManager({ origin: "http://localhost:5088" });
  const session = options.session === undefined ? ownerSessionRecord : options.session;
  if (session) manager.setSession(session);
  manager.markRestored();
  return manager;
}
