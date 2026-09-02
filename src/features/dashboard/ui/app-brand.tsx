import { Package } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function AppBrand({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2.5", className)}
      aria-label="InventoryMS"
    >
      <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25">
        <Package className="size-4 text-primary-foreground" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"
          aria-hidden
        />
      </div>
      <span className="text-base font-semibold tracking-tight text-navy-foreground">
        Inventory<span className="text-primary">MS</span>
      </span>
    </div>
  );
}
