import { useMutation } from "@tanstack/react-query";
import { useSyncExternalStore, useState, type FormEvent } from "react";
import { exchangeRegisterPin } from "../../auth/api/auth-api";
import { prepareRegister } from "../../offline-sync/prepare-register";
import { setPosPreparedShiftActive } from "../../pos/pos-location-guard-store";
import { useSession } from "../../../shared/auth/session-context";
import {
  getRegisterAuthState,
  isRegisterUnlocked,
  subscribeRegisterAuth,
  unlockRegister,
} from "../../../shared/auth/register-auth-store";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function RegisterPinUnlock({
  registerId,
  shiftId,
  onUnlocked,
}: {
  registerId: string;
  shiftId?: string;
  onUnlocked?: () => void;
}) {
  const { session } = useSession();
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
    isRegisterUnlocked(tenantId, registerId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      if (!shiftId) {
        throw new Error("Open a shift before unlocking this till for offline sales.");
      }
      const exchanged = await exchangeRegisterPin({ userId, pin, registerId });
      await unlockRegister({
        tenantId,
        registerId,
        shiftId,
        accessToken: exchanged.accessToken,
        expiresAt: exchanged.expiresAt,
      });
      await prepareRegister({
        tenantId,
        registerId,
        shiftId,
        credentialExpiresAt: exchanged.expiresAt,
      });
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
      <p>
        Enter your register PIN to authorize offline sales and sync for this till.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Register PIN"
        required
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
