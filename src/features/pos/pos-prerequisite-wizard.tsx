import { ONBOARDING_STEPS } from "../onboarding/onboarding-steps";

export function PosPrerequisiteWizard({
  hasLocation,
  hasRegister,
  hasOpenShift,
}: {
  hasLocation: boolean;
  hasRegister: boolean;
  hasOpenShift: boolean;
}) {
  const steps = [
    {
      key: "location",
      label: "Create a location",
      description: "Stock, tills, and sales belong to a location.",
      to: "/locations",
      done: hasLocation,
    },
    {
      key: "register",
      label: "Create a till",
      description: ONBOARDING_STEPS.find((step: { key: string }) => step.key === "register")
        ?.description,
      to: "/registers",
      done: hasRegister,
    },
    {
      key: "shift",
      label: "Open a shift with counted float",
      description: ONBOARDING_STEPS.find((step: { key: string }) => step.key === "firstSale")
        ?.description,
      to: "/registers",
      done: hasOpenShift,
    },
  ] as const;

  return (
    <section
      className="flex flex-col gap-4 rounded-md border p-4"
      aria-labelledby="pos-prerequisites-heading"
    >
      <h2 id="pos-prerequisites-heading" className="text-lg font-semibold">
        Before you can sell
      </h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="flex min-h-touch items-start gap-3 rounded-md border p-3"
            aria-current={!step.done && steps[index - 1]?.done !== false ? "step" : undefined}
          >
            <span
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
              aria-hidden
            >
              {step.done ? "✓" : String(index + 1)}
            </span>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-medium">{step.label}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {!step.done ? (
                <a className="text-sm underline" href={step.to}>
                  {step.label}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Complete</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
