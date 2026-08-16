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

export interface AppShellNavItem {
  to: string;
  label: string;
}

export interface AppShellProps {
  children: ReactNode;
  navigation: AppShellNavItem[];
  locationName: string;
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

export function AppShell({
  children,
  navigation,
  locationName,
  isOnline = true,
  pendingSaleCount = 0,
  renderLink,
}: AppShellProps) {
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
        <header className="flex items-center gap-3 border-b px-3 py-2">
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
          <p className="text-sm text-muted-foreground">{locationName}</p>
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
            className="hidden w-56 shrink-0 border-r p-3 md:block"
            aria-label="Primary"
          >
            <ul className="flex flex-col gap-1">
              {navigation.map((item) => (
                <li key={item.to}>
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
          </nav>
          <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden p-4">
            {children}
          </main>
        </div>
        {open ? (
          <SheetContent side="left" className="w-72">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary application destinations</SheetDescription>
            <nav aria-label="Mobile">
              <ul className="mt-4 flex flex-col gap-1">
                {navigation.map((item) => (
                  <li key={item.to}>
                    <SheetClose asChild>
                      {link(item, "flex min-h-touch items-center rounded-md px-3")}
                    </SheetClose>
                  </li>
                ))}
              </ul>
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
