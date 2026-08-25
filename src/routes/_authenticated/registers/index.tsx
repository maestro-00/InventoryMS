import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/ui/tabs";
import { useSession } from "../../../shared/auth/session-context";
import { useActiveLocationId } from "../../../shared/location/use-active-location";
import {
  fetchRegisters,
  openShiftsQueryKey,
  type ShiftRecord,
} from "../../../features/registers/registers/api/registers-api";
import { RegisterForm } from "../../../features/registers/registers/register-form";
import { RegisterEditForm } from "../../../features/registers/registers/register-edit-form";
import { OpenShift } from "../../../features/registers/shifts/open-shift";
import { useOpenShifts } from "../../../features/registers/shifts/use-open-shifts";
import { CashMovementForm } from "../../../features/registers/shifts/cash-movement";
import {
  CloseShiftForm,
  type CloseShiftResult,
} from "../../../features/registers/shifts/close-shift";
import { ZReport } from "../../../features/registers/shifts/z-report";
import { RegisterPinUnlock } from "../../../features/registers/pin-unlock/register-pin-unlock";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";

export const Route = createFileRoute("/_authenticated/registers/")({
  component: RegistersPage,
});

function RegistersPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const canSell = session?.permissions.includes("Sell") === true;
  const locationId = useActiveLocationId();
  const registers = useQuery({
    queryKey: ["registers", locationId],
    queryFn: () => fetchRegisters(locationId),
    enabled: locationId !== "",
  });
  const {
    entries: openShiftEntries,
    isPending: openShiftsPending,
    isError: openShiftsError,
    error: openShiftsLoadError,
  } = useOpenShifts({ enabled: canSell && locationId !== "" });
  const [shift, setShift] = useState<ShiftRecord | null>(null);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const registerList = registers.data ?? [];
  const activeShift =
    shift ??
    (openShiftEntries.length === 1 ? (openShiftEntries[0]?.shift ?? null) : null);

  function registerLabel(entry: (typeof openShiftEntries)[number]): string {
    return entry.registerName;
  }

  function onOpened(opened: ShiftRecord) {
    setClosedNotice(null);
    setShift(opened);
    void queryClient.invalidateQueries({ queryKey: openShiftsQueryKey });
  }

  function onClosed(result: CloseShiftResult) {
    setShift(null);
    setClosedNotice(`Shift closed (${result.status}).`);
    void queryClient.invalidateQueries({ queryKey: openShiftsQueryKey });
  }

  if (locationId === "") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <h1>Tills and shifts</h1>
        <p>Create a location before adding tills.</p>
      </main>
    );
  }

  if (registers.isLoading || openShiftsPending) {
    return <LoadingState label="Loading tills and open shifts" />;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">Tills and shifts</h1>

      {closedNotice ? (
        <p role="status" className="rounded-md border border-accent/40 p-3 text-sm">
          {closedNotice}
        </p>
      ) : null}

      {openShiftsError ? <ProblemSummary problem={toProblem(openShiftsLoadError)} /> : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Manage tills</TabsTrigger>
          <TabsTrigger value="shift">Shift</TabsTrigger>
          <TabsTrigger value="pin">PIN</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          {openShiftEntries.length > 0 ? (
            <section className="flex flex-col gap-2" aria-label="Open shifts">
              <h2>Open shifts</h2>
              <ul className="flex flex-col gap-2">
                {openShiftEntries.map((entry) => {
                  const isActive = activeShift?.id === entry.shift.id;
                  return (
                    <li
                      key={entry.shift.id}
                      className={isActive ? "font-medium" : undefined}
                    >
                      {isActive ? (
                        <span>
                          {registerLabel(entry)} — open since{" "}
                          {new Date(entry.shift.openedAt).toLocaleString()} (active)
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShift(entry.shift);
                          }}
                        >
                          Resume shift on {registerLabel(entry)}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <p>No open shifts. Open one from the Shift tab.</p>
          )}
        </TabsContent>

        <TabsContent value="manage" className="flex flex-col gap-4">
          {registerList.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {registerList.map((register) => (
                <li key={register.id}>
                  <RegisterEditForm
                    register={register}
                    onUpdated={() => {
                      void registers.refetch();
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <RegisterForm
            locationId={locationId}
            hasExistingRegisters={registerList.length > 0}
            onCreated={() => {
              void registers.refetch();
            }}
          />
        </TabsContent>

        <TabsContent value="shift" className="flex flex-col gap-6">
          {registerList.length === 0 ? (
            <p>Create a till before opening a shift.</p>
          ) : !activeShift ? (
            <OpenShift registers={registerList} onOpened={onOpened} />
          ) : (
            <>
              <CashMovementForm shiftId={activeShift.id} />
              <CloseShiftForm shiftId={activeShift.id} onClosed={onClosed} />
              <ZReport shiftId={activeShift.id} />
            </>
          )}
        </TabsContent>

        <TabsContent value="pin">
          {activeShift ? (
            <RegisterPinUnlock
              registerId={activeShift.registerId}
              shiftId={activeShift.id}
            />
          ) : (
            <p>Open a shift to unlock the till for offline sync.</p>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
