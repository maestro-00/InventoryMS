import { useMutation } from "@tanstack/react-query";
import { useSyncExternalStore, useState, type FormEvent } from "react";
import { exchangeRegisterPin } from "../../auth/api/auth-api";
import { prepareRegister } from "../../offline-sync/prepare-register";
import { setPosPreparedShiftActive } from "../../pos/pos-location-guard-store";
import { parseAppProblem } from "../../../shared/api/errors/app-problem";
import { isProblemError, ProblemError } from "../../../shared/api/errors/problem-error";
import { useSession } from "../../../shared/auth/session-context";
import {
  getRegisterAuthState,
  isRegisterUnlockedForShift,
  subscribeRegisterAuth,
  unlockRegister,
} from "../../../shared/auth/register-auth-store";
import { lockRegisterPartitionMeta } from "../../../shared/db/register-partition-lock";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

const inventoryxOrigin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

/**
 * Snapshot requires a register-scoped bearer token. Fetch with the exchanged PIN
 * token before unlockRegister so a failed prepare never leaves the till unlocked.
 */
async function fetchSnapshotWithRegisterToken(
  registerId: string,
  accessToken: string,
): Promise<unknown> {
  const url = new URL(`${inventoryxOrigin}/api/v1/sync/snapshot`);
  url.searchParams.set("registerId", registerId);
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new ProblemError(
      parseAppProblem({
        status: response.status,
        body,
        headers: response.headers,
      }),
    );
  }
  return response.json();
}

function asPrepareProblem(error: unknown): ProblemError {
  if (isProblemError(error)) return error;
  return new ProblemError({
    kind: "unknown",
    status: 0,
    title: "Till preparation failed",
    detail:
      error instanceof Error
        ? error.message
        : "Could not prepare the offline partition for this till.",
    fieldErrors: {},
    extensions: {},
  });
}

export function RegisterPinUnlock({
  registerId,
  shiftId,
  shiftClosesAt,
  onUnlocked,
}: {
  registerId: string;
  shiftId?: string;
  /** Optional known shift end; folded into unlock + prepare deadlines when present. */
  shiftClosesAt?: string | null;
  onUnlocked?: () => void;
}) {
  const { session, manager } = useSession();
  const authState = useSyncExternalStore(
    subscribeRegisterAuth,
    getRegisterAuthState,
    getRegisterAuthState,
  );
  const [pin, setPin] = useState("");
  const tenantId = session?.tenantId ?? "";
  const userId = session?.userId ?? "";
  const unlocked =
    tenantId !== "" &&
    registerId !== "" &&
    Boolean(shiftId) &&
    isRegisterUnlockedForShift(tenantId, registerId, shiftId ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      if (!shiftId) {
        throw new Error("Open a shift before unlocking this till for offline sales.");
      }
      const exchanged = await exchangeRegisterPin({ userId, pin, registerId });
      try {
        // Prepare offline partition before unlock/bind so a prepare failure never
        // shows an unlocked till or binds session.registerId.
        await prepareRegister({
          tenantId,
          registerId,
          shiftId,
          credentialExpiresAt: exchanged.expiresAt,
          shiftClosesAt: shiftClosesAt ?? null,
          fetchSnapshot: () =>
            fetchSnapshotWithRegisterToken(registerId, exchanged.accessToken),
        });
      } catch (error) {
        // Prepare runs before unlockRegister — do not call lockRegisterAuth here:
        // that would clear an unrelated till already unlocked in this session.
        // Only fail-closed the attempted partition if prepare wrote partial meta.
        await lockRegisterPartitionMeta(tenantId, registerId);
        throw asPrepareProblem(error);
      }
      await unlockRegister({
        tenantId,
        registerId,
        shiftId,
        accessToken: exchanged.accessToken,
        expiresAt: exchanged.expiresAt,
        shiftClosesAt: shiftClosesAt ?? null,
      });
      manager.bindActiveRegister(registerId);
      setPosPreparedShiftActive(true);
    },
    onSuccess: () => {
      setPin("");
      onUnlocked?.();
    },
  });

  const problem = toProblem(mutation.error);

  if (unlocked) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Register unlocked until{" "}
        {authState.deadline
          ? new Date(authState.deadline).toLocaleString()
          : "shift close"}
        .
      </p>
    );
  }

  if (!shiftId) {
    return (
      <p className="text-sm text-muted-foreground">
        Open a shift on this till before unlocking for offline sales.
      </p>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Unlock register"
      onSubmit={submit}
      noValidate
    >
      <h2>Unlock till</h2>
      <p>Enter your register PIN to authorize offline sales and sync for this till.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Register PIN"
        required
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(event) => {
          setPin(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending || pin.trim() === ""}>
        {mutation.isPending ? "Unlocking…" : "Unlock till"}
      </Button>
    </form>
  );
}
