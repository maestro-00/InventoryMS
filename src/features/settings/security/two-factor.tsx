import { useMutation } from "@tanstack/react-query";
import { enrollTwoFactor } from "../../staff/api/staff-api";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function TwoFactorSettings() {
  const enroll = useMutation({ mutationFn: enrollTwoFactor });
  const problem = toProblem(enroll.error);

  return (
    <section aria-label="Two-factor authentication" className="space-y-3">
      <h2>Two-factor authentication</h2>
      <p>
        Enrollment returns a shared key and authenticator URI. Recovery codes are owned
        by InventoryX and are never re-displayed after first issue.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <Button
        type="button"
        onClick={() => {
          enroll.mutate();
        }}
        disabled={enroll.isPending}
      >
        Enroll 2FA
      </Button>
      {enroll.data ? (
        <div>
          <p role="status">2FA enrollment started.</p>
          <p>Shared key: {enroll.data.sharedKey}</p>
          <p className="break-all">{enroll.data.authenticatorUri}</p>
        </div>
      ) : null}
    </section>
  );
}
