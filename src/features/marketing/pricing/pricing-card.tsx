import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export type PricingCardProps = {
  plan: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaTo?: string;
  highlighted?: boolean;
  badge?: string;
};

export function PricingCard({
  plan,
  price,
  period = "/ month",
  description,
  features,
  cta,
  ctaTo = "/register",
  highlighted = false,
  badge = "",
}: PricingCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-xl border p-5 transition-all duration-300 sm:p-8",
        highlighted
          ? "z-10 border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20 md:-mt-2 md:mb-2 md:scale-[1.03]"
          : "border-border bg-card hover:border-primary/20 hover:shadow-md",
      )}
    >
      {highlighted ? (
        <div
          className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-b from-primary-foreground/10 to-transparent"
          aria-hidden
        />
      ) : null}
      {badge ? (
        <span
          className={cn(
            "relative mb-4 self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest",
            highlighted
              ? "bg-primary-foreground text-primary"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {badge}
        </span>
      ) : (
        <div className="relative mb-4 h-6" aria-hidden />
      )}
      <p
        className={cn(
          "relative mb-1 text-sm font-semibold",
          highlighted ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {plan}
      </p>
      <div className="relative mb-2 flex items-end gap-1">
        <span
          className={cn(
            "text-4xl font-bold",
            highlighted ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {price}
        </span>
        <span
          className={cn(
            "mb-1.5 text-sm",
            highlighted ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {period}
        </span>
      </div>
      <p
        className={cn(
          "relative mb-8 text-sm leading-relaxed",
          highlighted ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
      <ul className="relative mb-8 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5">
            <Check
              className={cn(
                "size-[15px] shrink-0",
                highlighted ? "text-primary-foreground" : "text-success",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-sm",
                highlighted ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaTo}
        className={cn(
          "relative inline-flex min-h-touch items-center justify-center rounded-lg py-2.5 text-center text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]",
          highlighted
            ? "bg-primary-foreground text-primary shadow-md"
            : "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
        )}
      >
        {cta}
      </Link>
    </article>
  );
}
