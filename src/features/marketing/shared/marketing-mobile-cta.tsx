import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

export function MarketingMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:hidden">
      <Button asChild className="w-full shadow-md shadow-primary/15">
        <Link to="/register">Start free trial</Link>
      </Button>
    </div>
  );
}
