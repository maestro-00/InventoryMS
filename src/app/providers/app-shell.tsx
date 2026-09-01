import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Menu, X } from "lucide-react";
import { AppBrand } from "../../features/dashboard/ui/app-brand";
import { LiveStatusBadge } from "../../features/dashboard/ui/live-status-badge";
import { Button } from "../../shared/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../../shared/ui/sheet";
import { cn } from "../../shared/utils/cn";
import type { NavGroup } from "../navigation/nav-config";

export interface AppShellNavItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

export interface AppShellProps {
  children: ReactNode;
  navigation?: AppShellNavItem[];
  navigationGroups?: NavGroup[];
  locationControl?: ReactNode;
  shiftControl?: ReactNode;
  breadcrumb?: ReactNode;
  tenantLabel?: string;
  roleLabel?: string;
  primaryCta?: { label: string; to: string };
  renderFooterControl?: () => ReactNode;
  isOnline?: boolean;
  pendingSaleCount?: number;
  renderLink?: (
    item: AppShellNavItem,
    className: string,
    onNavigate?: () => void,
    isActive?: boolean,
  ) => ReactNode;
}

function NavList({
  groups,
  link,
  onNavigate,
  variant = "sidebar",
}: {
  groups: NavGroup[];
  link: (
    item: AppShellNavItem,
    className: string,
    onNavigate?: () => void,
    isActive?: boolean,
  ) => ReactNode;
  onNavigate?: () => void;
  variant?: "sidebar" | "sheet";
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.id} className="mb-5 last:mb-0">
          <p
            className={cn(
              "mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest",
              variant === "sidebar"
                ? "text-navy-foreground/45"
                : "text-muted-foreground",
            )}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                {link(
                  item,
                  cn(
                    "flex min-h-touch items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    variant === "sidebar"
                      ? "text-navy-foreground/75 hover:bg-navy-light/70 hover:text-navy-foreground"
                      : "text-foreground hover:bg-muted",
                  ),
                  onNavigate,
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function AppShell({
  children,
  navigation = [],
  navigationGroups,
  locationControl,
  shiftControl,
  breadcrumb,
  tenantLabel,
  roleLabel,
  primaryCta,
  renderFooterControl,
  isOnline = true,
  pendingSaleCount = 0,
  renderLink,
}: AppShellProps) {
  const groups =
    navigationGroups ??
    (navigation.length > 0
      ? [{ id: "primary", label: "Menu", items: navigation }]
      : []);

  const defaultLink = (
    item: AppShellNavItem,
    className: string,
    onNavigate?: () => void,
  ): ReactNode => (
    <a
      href={item.to}
      className={className}
      onClick={() => {
        onNavigate?.();
      }}
    >
      {item.icon ? (
        <item.icon className="size-4 shrink-0 opacity-80" aria-hidden />
      ) : null}
      {item.label}
    </a>
  );

  const link = renderLink ?? defaultLink;

  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          window.setTimeout(() => {
            menuButtonRef.current?.focus();
          }, 0);
        }
      }}
    >
      <div
        data-testid="app-shell"
        className="flex min-h-dvh max-w-full min-w-0 flex-col overflow-x-hidden bg-background font-sans"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:p-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-navy-light/60 bg-navy/95 px-3 py-2 backdrop-blur-md sm:px-4">
          <SheetTrigger asChild>
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="size-touch text-navy-foreground hover:bg-navy-light/60 hover:text-navy-foreground md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <div className="md:hidden">
            <AppBrand />
          </div>

          <div className="hidden min-w-0 flex-1 px-2 md:block">
            {breadcrumb ?? (
              <p className="truncate text-sm text-navy-foreground/70">
                {tenantLabel ? (
                  <>
                    <span className="text-navy-foreground/90">{tenantLabel}</span>
                    <span className="mx-1.5 text-navy-foreground/40">/</span>
                  </>
                ) : null}
                <span className="text-navy-foreground">Dashboard</span>
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 [&_button]:border-navy-light/50 [&_button]:bg-navy-light/30 [&_button]:text-navy-foreground [&_span]:text-navy-foreground/80">
            {locationControl}
            {shiftControl}
          </div>

          <LiveStatusBadge
            isOnline={isOnline}
            pendingSaleCount={pendingSaleCount}
            variant="dark"
            className="ml-auto hidden sm:inline-flex"
          />
        </header>

        <div className="flex min-w-0 flex-1">
          <nav
            className="hidden w-60 shrink-0 flex-col border-r border-navy-light/60 bg-navy md:flex"
            aria-label="Primary"
          >
            <div className="border-b border-navy-light/60 p-4">
              <AppBrand className="mb-3" />
              {tenantLabel || roleLabel ? (
                <div className="mb-3 space-y-0.5">
                  {tenantLabel ? (
                    <p className="truncate text-sm font-medium text-navy-foreground">
                      {tenantLabel}
                    </p>
                  ) : null}
                  {roleLabel ? (
                    <p className="text-xs text-navy-foreground/55">{roleLabel}</p>
                  ) : null}
                </div>
              ) : null}
              {primaryCta ? (
                <Button
                  asChild
                  className="w-full shadow-lg shadow-primary/20"
                  size="sm"
                >
                  <Link to={primaryCta.to}>{primaryCta.label}</Link>
                </Button>
              ) : null}
            </div>

            <div className="app-scrollbar-navy flex-1 overflow-y-auto p-3">
              <NavList groups={groups} link={link} variant="sidebar" />
            </div>

            <div className="space-y-1 border-t border-navy-light/60 p-3">
              <Link
                to="/settings/security"
                className="flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm text-navy-foreground/70 transition-colors hover:bg-navy-light/60 hover:text-navy-foreground"
              >
                <HelpCircle className="size-4" aria-hidden />
                Help & security
              </Link>
              {renderFooterControl?.()}
            </div>
          </nav>

          <main
            id="main-content"
            className="app-page-background min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6"
          >
            {children}
          </main>
        </div>

        {open ? (
          <SheetContent
            side="left"
            className="app-scrollbar-navy w-72 overflow-y-auto border-r border-navy-light/60 bg-navy p-0 text-navy-foreground"
          >
            <div className="border-b border-navy-light/60 p-4">
              <SheetTitle className="text-navy-foreground">Navigation</SheetTitle>
              <SheetDescription className="text-navy-foreground/60">
                Primary application destinations
              </SheetDescription>
              {primaryCta ? (
                <SheetClose asChild>
                  <Link
                    to={primaryCta.to}
                    className="mt-3 inline-flex min-h-touch w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    {primaryCta.label}
                  </Link>
                </SheetClose>
              ) : null}
            </div>
            <nav aria-label="Mobile" className="p-3">
              <NavList
                groups={groups}
                link={(item, className, onNavigate) =>
                  link(item, className, () => {
                    onNavigate?.();
                    setOpen(false);
                  })
                }
                variant="sidebar"
              />
            </nav>
            {renderFooterControl ? (
              <div className="space-y-1 border-t border-navy-light/60 p-3">
                <Link
                  to="/settings/security"
                  className="flex min-h-touch items-center gap-2 rounded-lg px-3 text-sm text-navy-foreground/70 transition-colors hover:bg-navy-light/60 hover:text-navy-foreground"
                >
                  <HelpCircle className="size-4" aria-hidden />
                  Help & security
                </Link>
                {renderFooterControl?.()}
              </div>
            ) : null}
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="mx-3 mb-4 text-navy-foreground hover:bg-navy-light/60"
                aria-label="Close navigation"
              >
                <X className="size-4" />
                Close navigation
              </Button>
            </SheetClose>
          </SheetContent>
        ) : null}
      </div>
    </Sheet>
  );
}
