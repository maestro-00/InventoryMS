import type { ReactNode } from "react";
import { MapPin, RefreshCw, WifiOff } from "lucide-react";
import { MarketingBrand } from "../shared/marketing-brand";
import { MarketingAtmosphere } from "../shared/marketing-ui";

export function PublicAuthLayout({
  leftContent,
  rightContent,
}: {
  leftContent: ReactNode;
  rightContent: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:flex-row">
      <MarketingAtmosphere className="order-2 flex w-full flex-col justify-between px-4 py-8 sm:px-6 lg:order-1 lg:w-1/2 lg:p-14">
        <MarketingBrand />
        <div className="flex flex-1 flex-col justify-center py-6 lg:py-0">{leftContent}</div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-navy-light/50 bg-navy-light/30 p-4 backdrop-blur-sm lg:mt-0 lg:border-t lg:border-navy-light lg:bg-transparent lg:p-0 lg:pt-6">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground shadow-sm"
            aria-hidden
          >
            AK
          </div>
          <div>
            <p className="text-sm font-medium text-navy-foreground">Ama Kwame, Store Owner</p>
            <p className="text-xs text-navy-foreground/70">
              Running inventory and POS across Accra locations
            </p>
          </div>
        </div>
      </MarketingAtmosphere>
      <div className="order-1 flex w-full items-center justify-center bg-background px-4 py-8 sm:px-6 lg:order-2 lg:w-1/2 lg:p-14">
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl shadow-foreground/5 sm:p-8">
          {rightContent}
        </div>
      </div>
    </div>
  );
}

export function LoginLeftPanel() {
  const items = [
    { icon: MapPin, text: "Multi-location inventory visibility" },
    { icon: WifiOff, text: "Offline-capable counter sales" },
    { icon: RefreshCw, text: "Real-time stock after every sale" },
  ];

  return (
    <div>
      <h2 className="mb-3 text-3xl font-bold leading-tight text-navy-foreground sm:mb-4 sm:text-4xl">
        Your stores.
        <br />
        Your stock.
        <br />
        <span className="text-primary">Always in sync.</span>
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-navy-foreground/70 sm:mb-10">
        InventoryMS helps retailers manage inventory, ring up sales, and report
        performance from one place — built for Ghana businesses.
      </p>
      <ul className="flex flex-col gap-3 sm:gap-4">
        {items.map((item) => (
          <li key={item.text} className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-light/80">
              <item.icon className="size-4 text-primary" aria-hidden />
            </div>
            <span className="text-sm text-navy-foreground">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RegisterLeftPanel() {
  const steps = [
    "Create your business account",
    "Add your first location",
    "Import or add products",
    "Make your first sale",
  ];

  return (
    <div>
      <h2 className="mb-3 text-3xl font-bold leading-tight text-navy-foreground sm:mb-4 sm:text-4xl">
        Get set up in <span className="text-primary">minutes,</span>
        <br />
        not months.
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-navy-foreground/70 sm:mb-10">
        Start your 14-day Professional trial with no credit card. Onboarding
        walks you through the essentials.
      </p>
      <ol className="flex flex-col gap-3 sm:gap-4">
        {steps.map((text, index) => (
          <li key={text} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm text-navy-foreground">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
