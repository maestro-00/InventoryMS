import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function MarketingBrand({
  className,
  linkTo = "/",
  tone = "dark",
}: {
  className?: string;
  linkTo?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      to={linkTo}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="InventoryMS home"
    >
      <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
        <Package className="size-4 text-primary-foreground" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "text-base font-semibold tracking-tight",
          tone === "light" ? "text-foreground" : "text-navy-foreground",
        )}
      >
        Inventory<span className="text-primary">MS</span>
      </span>
    </Link>
  );
}
