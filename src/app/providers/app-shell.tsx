import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
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
}

export interface AppShellProps {
  children: ReactNode;
  /** Flat nav for legacy callers; ignored when navigationGroups is set. */
  navigation?: AppShellNavItem[];
  navigationGroups?: NavGroup[];
  locationControl?: ReactNode;
  shiftControl?: ReactNode;
  /** Live connectivity; defaults to online when omitted (tests / public shells). */
  isOnline?: boolean;
  /** Pending offline sales for the active register, when known. */
  pendingSaleCount?: number;
  /**
   * Renders a navigation destination. The router supplies a client-side link so a move
   * between pages never reloads the document and drops the in-memory session.
   */
  renderLink?: (item: AppShellNavItem, className: string) => ReactNode;
}

function NavList({
  groups,
  link,
  onNavigate,
}: {
  groups: NavGroup[];
  link: (item: AppShellNavItem, className: string) => ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.id} className="mb-4 last:mb-0">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.to} onClick={onNavigate}>
                {link(
                  item,
                  cn(
                    "flex min-h-touch items-center rounded-md px-3 text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                  ),
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
  isOnline = true,
  pendingSaleCount = 0,
  renderLink,
}: AppShellProps) {
  const groups =
    navigationGroups ??
    (navigation.length > 0
      ? [{ id: "primary", label: "Menu", items: navigation }]
      : []);

  const link = (item: AppShellNavItem, className: string): ReactNode =>
    renderLink ? (
      renderLink(item, className)
    ) : (
      <a href={item.to} className={className}>
        {item.label}
      </a>
    );

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
        className="flex min-h-dvh max-w-full min-w-0 flex-col overflow-x-hidden bg-background"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2"
        >
          Skip to content
        </a>
        <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <SheetTrigger asChild>
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="size-touch"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <p className="font-semibold">InventoryMS</p>
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            {locationControl}
            {shiftControl}
          </div>
          <p
            className="ml-auto min-w-28 text-right text-sm text-muted-foreground"
            data-testid="shell-connectivity"
          >
            {isOnline ? "Online" : "Offline"}
            {pendingSaleCount > 0
              ? ` · ${String(pendingSaleCount)} pending sync`
              : null}
          </p>
        </header>
        <div className="flex min-w-0 flex-1">
          <nav
            className="hidden w-56 shrink-0 overflow-y-auto border-r p-3 md:block"
            aria-label="Primary"
          >
            <NavList groups={groups} link={link} />
          </nav>
          <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden p-4">
            {children}
          </main>
        </div>
        {open ? (
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary application destinations</SheetDescription>
            <nav aria-label="Mobile" className="mt-4">
              <NavList
                groups={groups}
                link={(item, className) => (
                  <SheetClose asChild>{link(item, className)}</SheetClose>
                )}
                onNavigate={() => {
                  setOpen(false);
                }}
              />
            </nav>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="mt-4"
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
