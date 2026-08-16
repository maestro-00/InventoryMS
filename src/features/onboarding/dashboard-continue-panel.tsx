import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useSession } from "../../shared/auth/session-context";
import { formatGhanaMoney } from "../../shared/money/decimal";
import { fetchHeldSales } from "../pos/held-sales/api/held-sales-api";
import {
  getOpenShiftHintsSnapshot,
  listOpenShiftHints,
  subscribeOpenShiftHints,
} from "../registers/shifts/open-shift-resume-store";
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

  const hintsSnapshot = useSyncExternalStore(
    subscribeOpenShiftHints,
    getOpenShiftHintsSnapshot,
    () => "[]",
  );
  void hintsSnapshot;
  const openShifts = session?.tenantId ? listOpenShiftHints(session.tenantId) : [];

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
  const hasShifts = canSell && openShifts.length > 0;

  if (!hasSetupCta && !hasHeld && !hasShifts) return null;

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
        {openShifts.map((hint) => (
          <li key={hint.shiftId}>
            <Link className="underline" to="/pos">
              Resume shift on {hint.registerName}
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
