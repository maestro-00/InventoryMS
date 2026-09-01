import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { MarketingBrand } from "./marketing-brand";

const NAV_ITEMS = [
  { label: "Features", to: "/features" as const, page: "features" },
  { label: "Pricing", to: "/pricing" as const, page: "pricing" },
] as const;

function blurActiveElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

export function MarketingMobileMenu({ activePage = "" }: { activePage?: string }) {
  const [open, setOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMenuKey((key) => key + 1);
      return;
    }
    blurActiveElement();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-navy-foreground hover:bg-navy-light sm:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-xs"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          blurActiveElement();
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-left">
            <MarketingBrand tone="light" />
          </SheetTitle>
        </SheetHeader>
        <nav key={menuKey} aria-label="Mobile" className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.page}
              to={item.to}
              aria-current={activePage === item.page ? "page" : undefined}
              onClick={() => {
                setOpen(false);
                blurActiveElement();
              }}
              className="marketing-mobile-nav-link min-h-touch rounded-md px-4 py-3 text-base font-medium text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => {
              setOpen(false);
              blurActiveElement();
            }}
            className="marketing-mobile-nav-link min-h-touch rounded-md px-4 py-3 text-base font-medium text-muted-foreground"
          >
            Sign in
          </Link>
        </nav>
        <div className="mt-6">
          <Button asChild className="w-full">
            <Link
              to="/register"
              onClick={() => {
                setOpen(false);
                blurActiveElement();
              }}
            >
              Start free trial
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
