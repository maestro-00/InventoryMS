import { Link } from "@tanstack/react-router";
import { MarketingBrand } from "./marketing-brand";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", to: "/features" as const },
      { label: "Pricing", to: "/pricing" as const },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/" as const },
      { label: "Contact support", to: "/login" as const },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/" as const },
      { label: "Terms of Service", to: "/" as const },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-navy-light/60 bg-navy px-4 pb-24 pt-10 sm:pb-10 md:px-16 md:pt-14">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden
      />
      <div className="mb-8 flex flex-col gap-8 sm:mb-12 sm:gap-10 lg:flex-row lg:gap-16">
        <div className="w-full max-w-xs">
          <MarketingBrand className="mb-4" />
          <p className="text-sm leading-relaxed text-navy-foreground/70">
            Inventory, POS, and reports built for Ghana retailers and multi-location
            stores.
          </p>
          <p className="mt-4 text-xs text-navy-foreground/60">
            Built for Ghana businesses
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:flex sm:flex-1 sm:flex-wrap sm:gap-10 md:gap-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-navy-foreground">
                {col.heading}
              </p>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-sm text-navy-foreground/70 hover:text-navy-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-navy-light pt-6">
        <p className="text-xs text-navy-foreground/60">
          © {new Date().getFullYear()} InventoryMS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
