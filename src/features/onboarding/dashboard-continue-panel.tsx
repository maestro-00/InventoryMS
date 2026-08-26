import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { formatGhanaMoney } from "../../shared/money/decimal";
import { fetchHeldSales } from "../pos/held-sales/api/held-sales-api";
import { useOpenShifts } from "../registers/shifts/use-open-shifts";
import { useTenant } from "../tenant/api/tenant-queries";
import {
  completedCount,
  isOnboardingComplete,
  ONBOARDING_STEPS,
} from "./onboarding-steps";

const SETUP_ROLES = new Set(["Owner", "Admin", "Administrator"]);

export function DashboardContinuePanel() {
  const { session } = useSession();
  const tenant = useTenant();
  const canSetup = session ? SETUP_ROLES.has(session.role) : false;
  const canSell = session?.permissions.includes("Sell") === true;
  const locationId = useActiveLocationId();

  const { entries: openShiftEntries, isPending: openShiftsPending } = useOpenShifts({
    enabled: canSell && locationId !== "",
    locationId,
  });

  const held = useQuery({
    queryKey: ["held-sales", "dashboard"],
    queryFn: fetchHeldSales,
    enabled: canSell,
  });

  const checklist = tenant.data?.tenant.onboardingChecklist ?? {};
  const setupComplete = isOnboardingComplete(checklist);
  const setupStarted = completedCount(checklist) > 0;
  const setupLabel = setupStarted ? "Resume setup" : "Get started";

  const hasSetupCta = canSetup && !setupComplete && !tenant.isPending;
  const hasHeld = canSell && (held.data?.length ?? 0) > 0;
  const hasShifts = canSell && openShiftEntries.length > 0;

  if (!hasSetupCta && !hasHeld && !hasShifts && !openShiftsPending) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Continue where you left off">
      <h2 className="text-lg font-semibold">Continue where you left off</h2>
      <ul className="flex flex-col gap-2">
        {hasSetupCta ? (
          <li>
            <Link className="underline" to="/onboarding">
              {setupLabel}
            </Link>
            <span className="text-sm text-muted-foreground">
              {" "}
              — {completedCount(checklist)} of {ONBOARDING_STEPS.length} steps
            </span>
          </li>
        ) : null}
        {openShiftsPending ? (
          <li className="text-sm text-muted-foreground">Loading open shifts…</li>
        ) : null}
        {openShiftEntries.map((entry) => (
          <li key={entry.shift.id}>
            <Link className="underline" to="/pos">
              Resume shift on {entry.registerName}
            </Link>
          </li>
        ))}
        {(held.data ?? []).map((sale) => (
          <li key={sale.id}>
            <Link className="underline" to="/pos">
              Resume held sale ({formatGhanaMoney(sale.grandTotal)})
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
