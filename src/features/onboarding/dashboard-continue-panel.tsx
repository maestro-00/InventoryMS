import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { formatGhanaMoney } from "../../shared/money/decimal";
import { Card, CardContent } from "../../shared/ui/card";
import { Progress } from "../../shared/ui/progress";
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
  const setupProgress = Math.round(
    (completedCount(checklist) / ONBOARDING_STEPS.length) * 100,
  );

  const hasSetupCta = canSetup && !setupComplete && !tenant.isPending;
  const hasHeld = canSell && (held.data?.length ?? 0) > 0;
  const hasShifts = canSell && openShiftEntries.length > 0;

  if (!hasSetupCta && !hasHeld && !hasShifts && !openShiftsPending) return null;

  return (
    <section className="space-y-3" aria-label="Continue where you left off">
      <h2 className="text-base font-semibold text-foreground">Continue where you left off</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {hasSetupCta ? (
          <li>
            <Card className="transition-colors hover:border-primary/25">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      className="text-sm font-semibold text-foreground hover:text-primary"
                      to="/onboarding"
                    >
                      {setupLabel}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {completedCount(checklist)} of {ONBOARDING_STEPS.length} steps complete
                    </p>
                    <Progress value={setupProgress} className="mt-3 h-1.5" />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              </CardContent>
            </Card>
          </li>
        ) : null}
        {openShiftsPending ? (
          <li className="text-sm text-muted-foreground">Loading open shifts…</li>
        ) : null}
        {openShiftEntries.map((entry) => (
          <li key={entry.shift.id}>
            <Card className="transition-colors hover:border-primary/25">
              <CardContent className="p-4">
                <Link
                  className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground hover:text-primary"
                  to="/pos"
                >
                  <span>Resume shift on {entry.registerName}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
        {(held.data ?? []).map((sale) => (
          <li key={sale.id}>
            <Card className="transition-colors hover:border-primary/25">
              <CardContent className="p-4">
                <Link
                  className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground hover:text-primary"
                  to="/pos"
                >
                  <span>Resume held sale ({formatGhanaMoney(sale.grandTotal)})</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
