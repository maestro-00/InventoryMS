import { PRICING_COMPARISON_ROWS } from "../shared/marketing-content";

const TIERS = ["Starter", "Professional", "Business"] as const;

export function PricingComparisonMobile() {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      {PRICING_COMPARISON_ROWS.map((row) => (
        <article
          key={row.feature}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">{row.feature}</h3>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {TIERS.map((tier, index) => {
              const value = [row.starter, row.professional, row.business][index];
              return (
                <div
                  key={tier}
                  className={index === 1 ? "rounded-lg bg-primary/5 py-2" : undefined}
                >
                  <dt
                    className={
                      index === 1
                        ? "mb-1 font-medium text-primary"
                        : "mb-1 font-medium text-muted-foreground"
                    }
                  >
                    {tier}
                  </dt>
                  <dd className="font-semibold text-foreground">{value}</dd>
                </div>
              );
            })}
          </dl>
        </article>
      ))}
    </div>
  );
}
