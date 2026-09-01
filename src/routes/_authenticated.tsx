import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { AppShell } from "../app/providers/app-shell";
import { SubscriptionBanner } from "../app/providers/subscription-gate";
import {
  buildNavigationGroups,
  resolvePrimaryShellCta,
} from "../app/navigation/nav-config";
import { ShiftStatusChip } from "../app/navigation/shift-status-chip";
import { evaluateAccess } from "../shared/auth/access-policy";
import { internalRedirectFromLocation } from "../shared/auth/redirect-target";
import { useSession } from "../shared/auth/session-context";
import { useOnlineStatus } from "../shared/hooks/use-online-status";
import {
  getPendingSaleCount,
  subscribePendingSaleCount,
} from "../features/offline-sync/pending-sale-count-store";
import { SignOutButton } from "../features/auth/sign-out";
import { LocationSwitcher } from "../shared/location/use-active-location";
import { useTenant } from "../features/tenant/api/tenant-queries";
import { cn } from "../shared/utils/cn";
import type { NavItem } from "../app/navigation/nav-config";

function oauthTokenSearch(
  search: Record<string, unknown>,
): Record<string, string> | null {
  const accessToken = search.accessToken;
  const refreshToken = search.refreshToken;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") return null;
  const params: Record<string, string> = { accessToken, refreshToken };
  const expiresAt = search.accessTokenExpiresAt;
  if (typeof expiresAt === "string") params.accessTokenExpiresAt = expiresAt;
  return params;
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await context.sessionManager.whenRestored();
    const session = context.sessionManager.getSnapshot();

    const access = evaluateAccess({
      session,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    });
    if (!access.allowed) {
      const returnTarget = internalRedirectFromLocation(
        location.pathname,
        location.searchStr,
      );
      const tokenParams = oauthTokenSearch(location.search as Record<string, unknown>);
      if (tokenParams && location.pathname !== "/auth/google-callback") {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
        throw redirect({
          to: "/auth/google-callback",
          search: {
            ...tokenParams,
            redirect: returnTarget,
          },
        });
      }
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({
        to: "/login",
        search: { redirect: returnTarget },
      });
    }
    return { session };
  },
  component: AuthenticatedLayout,
});

function routeLabel(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AuthenticatedLayout() {
  const { session } = useSession();
  const navigate = useNavigate();
  const tenant = useTenant();
  const isOnline = useOnlineStatus();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pendingSaleCount = useSyncExternalStore(
    subscribePendingSaleCount,
    getPendingSaleCount,
    getPendingSaleCount,
  );

  const navigationGroups = session
    ? buildNavigationGroups(session, tenant.data?.tenant.onboardingChecklist)
    : [];

  const tenantLabel = tenant.data?.tenant.name ?? undefined;
  const roleLabel = session?.role;
  const primaryCta = session ? resolvePrimaryShellCta(session) : undefined;
  const currentPage = routeLabel(pathname);

  const renderNavLink = (item: NavItem, className: string, onNavigate?: () => void) => (
    <Link
      to={item.to}
      className={className}
      activeProps={{
        className: cn(className, "app-sidebar-active text-navy-foreground"),
        "aria-current": "page",
      }}
      inactiveProps={{ className }}
      onClick={() => {
        onNavigate?.();
      }}
    >
      {item.icon ? (
        <item.icon className="size-4 shrink-0 opacity-90" aria-hidden />
      ) : null}
      {item.label}
    </Link>
  );

  return (
    <AppShell
      isOnline={isOnline}
      pendingSaleCount={pendingSaleCount}
      navigationGroups={navigationGroups}
      locationControl={<LocationSwitcher />}
      shiftControl={<ShiftStatusChip />}
      tenantLabel={tenantLabel}
      roleLabel={roleLabel}
      primaryCta={primaryCta}
      renderFooterControl={() => (
        <SignOutButton
          variant="ghost"
          size="sm"
          showIcon
          className="min-h-touch w-full justify-start gap-2 px-3 text-sm font-normal text-navy-foreground/70 hover:bg-navy-light/60 hover:text-navy-foreground"
          onSignedOut={() => {
            void navigate({ to: "/login" });
          }}
        />
      )}
      breadcrumb={
        <p className="truncate text-sm text-navy-foreground/70">
          {tenantLabel ? (
            <>
              <span className="text-navy-foreground/90">{tenantLabel}</span>
              <span className="mx-1.5 text-navy-foreground/40">/</span>
            </>
          ) : null}
          <span className="text-navy-foreground">{currentPage}</span>
        </p>
      }
      renderLink={renderNavLink}
    >
      <SubscriptionBanner />
      <Outlet />
    </AppShell>
  );
}
