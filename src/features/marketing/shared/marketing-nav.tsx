import { Link } from "@tanstack/react-router";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/ui/button";
import { MarketingBrand } from "./marketing-brand";
import { MarketingMobileMenu } from "./marketing-mobile-menu";

const NAV_ITEMS = [
  { label: "Features", to: "/features" as const, page: "features" },
  { label: "Pricing", to: "/pricing" as const, page: "pricing" },
] as const;

export function MarketingNav({ activePage = "" }: { activePage?: string }) {
  return (
    <header className="sticky top-0 z-30">
      <nav
        aria-label="Marketing"
        className="flex h-14 min-h-touch items-center justify-between border-b border-navy-light/60 bg-navy/90 px-4 backdrop-blur-md sm:h-16 md:px-10"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-6 md:gap-10">
          <MarketingBrand />
          <div className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.page}
                to={item.to}
                className={cn(
                  "min-h-touch rounded-md px-3 py-2 text-sm md:px-4",
                  activePage === item.page
                    ? "bg-navy-light text-navy-foreground"
                    : "text-navy-foreground/70 hover:text-navy-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <Link
            to="/login"
            className="hidden min-h-touch items-center px-2 py-2 text-sm text-navy-foreground/70 hover:text-navy-foreground sm:inline-flex md:px-3"
          >
            Sign in
          </Link>
          <Button
            asChild
            size="sm"
            className="hidden bg-primary text-primary-foreground sm:inline-flex"
          >
            <Link to="/register">Start free trial</Link>
          </Button>
          <MarketingMobileMenu activePage={activePage} />
        </div>
      </nav>
    </header>
  );
}
