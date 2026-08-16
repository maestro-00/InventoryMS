import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { useLocations } from "../../../features/inventory/locations/api/location-queries";
import { fetchRegisters } from "../../../features/registers/registers/api/registers-api";
import { RegisterForm } from "../../../features/registers/registers/register-form";
import { OpenShift } from "../../../features/registers/shifts/open-shift";
import { CashMovementForm } from "../../../features/registers/shifts/cash-movement";
import {
  CloseShiftForm,
  type CloseShiftResult,
} from "../../../features/registers/shifts/close-shift";
import { ZReport } from "../../../features/registers/shifts/z-report";
import {
  clearOpenShiftHint,
  listOpenShiftHints,
  setOpenShiftHint,
} from "../../../features/registers/shifts/open-shift-resume-store";
import type { ShiftRecord } from "../../../features/registers/registers/api/registers-api";
import { LoadingState } from "../../../shared/ui/states/ui-state";

export const Route = createFileRoute("/_authenticated/registers/")({
  component: RegistersPage,
});

function RegistersPage() {
  const { session } = useSession();
  const locations = useLocations();
  const locationId = locations.data?.[0]?.id ?? "";
  const registers = useQuery({
    queryKey: ["registers", locationId],
    queryFn: () => fetchRegisters(locationId),
    enabled: locationId !== "",
  });
  const [shift, setShift] = useState<ShiftRecord | null>(null);

  function onOpened(opened: ShiftRecord) {
    setShift(opened);
    if (!session?.tenantId) return;
    const register = registers.data?.find((entry) => entry.id === opened.registerId);
    setOpenShiftHint({
      tenantId: session.tenantId,
      registerId: opened.registerId,
      registerName: register?.name ?? "Register",
      shiftId: opened.id,
    });
  }

  function onClosed(_result: CloseShiftResult) {
    if (session?.tenantId && shift) {
      clearOpenShiftHint(session.tenantId, shift.id);
    }
    setShift(null);
  }

  if (locations.isLoading) {
    return <LoadingState label="Loading locations" />;
  }

  if (locationId === "") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <h1>Registers and shifts</h1>
        <p>Create a location before adding registers.</p>
      </main>
    );
  }

  const registerList = registers.data ?? [];
  const hints =
    session?.tenantId && !shift
      ? listOpenShiftHints(session.tenantId).filter((hint) =>
          registerList.some((register) => register.id === hint.registerId),
        )
      : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <h1>Registers and shifts</h1>

      {registers.isLoading ? <LoadingState label="Loading registers" /> : null}

      {registerList.length > 0 ? (
        <section className="flex flex-col gap-2" aria-label="Registers">
          <h2>Registers</h2>
          <ul className="flex flex-col gap-1">
            {registerList.map((register) => (
              <li key={register.id}>
                {register.name}
                {register.isActive ? "" : " (inactive)"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-label="Add register">
        <h2>
          {registerList.length === 0 ? "Create a register" : "Add another register"}
        </h2>
        <RegisterForm
          locationId={locationId}
          hasExistingRegisters={registerList.length > 0}
          onCreated={() => {
            void registers.refetch();
          }}
        />
      </section>

      {registerList.length > 0 ? (
        <OpenShift registers={registerList} onOpened={onOpened} />
      ) : null}

      {!shift && hints.length > 0 ? (
        <section className="flex flex-col gap-2" aria-label="Resume open shifts">
          <h2>Open shifts</h2>
          <ul className="flex flex-col gap-2">
            {hints.map((hint) => (
              <li key={hint.shiftId}>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setShift({
                      id: hint.shiftId,
                      registerId: hint.registerId,
                      openedBy: "",
                      openedAt: new Date().toISOString(),
                      openingFloat: "0",
                      status: "Open",
                    });
                  }}
                >
                  Resume shift on {hint.registerName}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shift ? (
        <>
          <CashMovementForm shiftId={shift.id} />
          <CloseShiftForm shiftId={shift.id} onClosed={onClosed} />
          <ZReport shiftId={shift.id} />
        </>
      ) : null}
    </main>
  );
}
