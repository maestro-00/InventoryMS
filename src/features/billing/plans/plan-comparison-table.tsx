import type { BillingPlan } from "../api/plan-schema";
import { buildComparisonRows } from "./plan-presentation";
import { cn } from "@/shared/utils/cn";

export function PlanComparisonTable({
  plans,
  highlightIndex = 1,
}: {
  plans: BillingPlan[];
  highlightIndex?: number;
}) {
  const rows = buildComparisonRows(plans);
  if (plans.length === 0 || rows.length === 0) return null;

  return (
    <>
      <PlanComparisonMobile plans={plans} highlightIndex={highlightIndex} />
      <div className="hidden overflow-x-auto md:block">
        <div
          className="min-w-[640px] overflow-hidden rounded-xl border border-border shadow-sm"
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(8rem,1fr) repeat(${String(plans.length)}, minmax(0,1fr))`,
          }}
        >
          <div className="bg-muted p-5 text-sm font-semibold text-muted-foreground">
            Feature
          </div>
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={cn(
                "bg-muted p-5 text-center text-sm font-semibold",
                index === highlightIndex ? "text-primary" : "text-foreground",
              )}
            >
              {plan.name}
            </div>
          ))}
          {rows.map((row, index) => (
            <div key={row.feature} className="contents">
              <div
                className={
                  index % 2 === 0
                    ? "border-t border-border bg-background p-4 text-sm text-foreground"
                    : "border-t border-border bg-muted/50 p-4 text-sm text-foreground"
                }
              >
                {row.feature}
              </div>
              {row.values.map((cell, cellIndex) => (
                <div
                  key={`${row.feature}-${plans[cellIndex]?.id ?? String(cellIndex)}`}
                  className={cn(
                    "border-t border-border p-4 text-center text-sm",
                    index % 2 === 0 ? "bg-background" : "bg-muted/50",
                    cellIndex === highlightIndex
                      ? "font-medium text-primary"
                      : undefined,
                  )}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PlanComparisonMobile({
  plans,
  highlightIndex,
}: {
  plans: BillingPlan[];
  highlightIndex: number;
}) {
  const rows = buildComparisonRows(plans);
  return (
    <div className="flex flex-col gap-4 md:hidden">
      {rows.map((row) => (
        <article
          key={row.feature}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">{row.feature}</h3>
          <dl
            className="grid gap-2 text-center text-xs"
            style={{
              gridTemplateColumns: `repeat(${String(plans.length)}, minmax(0,1fr))`,
            }}
          >
            {plans.map((plan, index) => (
              <div
                key={`${row.feature}-${plan.id}`}
                className={
                  index === highlightIndex ? "rounded-lg bg-primary/5 py-2" : undefined
                }
              >
                <dt
                  className={
                    index === highlightIndex
                      ? "mb-1 font-medium text-primary"
                      : "mb-1 font-medium text-muted-foreground"
                  }
                >
                  {plan.name}
                </dt>
                <dd className="font-semibold text-foreground">{row.values[index]}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
