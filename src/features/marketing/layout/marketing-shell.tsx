import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { MarketingFooter } from "../shared/marketing-footer";
import { MarketingMobileCta } from "../shared/marketing-mobile-cta";
import { MarketingNav } from "../shared/marketing-nav";

export function MarketingShell({
  activePage = "",
  children,
  showMobileCta = true,
}: {
  activePage?: string;
  children: ReactNode;
  showMobileCta?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <MarketingNav activePage={activePage} />
      <main
        id="main-content"
        className={cn("flex-1", showMobileCta ? "pb-24 md:pb-0" : undefined)}
      >
        {children}
      </main>
      <MarketingFooter />
      {showMobileCta ? <MarketingMobileCta /> : null}
    </div>
  );
}
