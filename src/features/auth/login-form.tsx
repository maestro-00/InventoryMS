import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../shared/ui/button";
import { TextField } from "../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../shared/ui/forms/problem-summary";
import { googleSignInUrl, login, type LoginOutcome } from "./api/auth-api";

export function LoginForm({
  onSignedIn,
  returnUrl = "/dashboard",
}: {
  onSignedIn: (outcome: LoginOutcome) => void;
  returnUrl?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [challenge, setChallenge] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (outcome) => {
      if (outcome.requiresTwoFactor) {
        setChallenge(true);
        return;
      }
      onSignedIn(outcome);
    },
  });

  useEffect(() => {
    if (challenge) codeRef.current?.focus();
  }, [challenge]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(
      challenge ? { email, password, twoFactorCode } : { email, password },
    );
  }

  const problem = toProblem(mutation.error);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {problem ? <ProblemSummary problem={problem} /> : null}

        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
        {challenge ? (
          <TextField
            ref={codeRef}
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            hint="Enter the six-digit code from your authenticator app."
            value={twoFactorCode}
            onChange={(event) => {
              setTwoFactorCode(event.target.value);
            }}
          />
        ) : null}

        <Button
          type="submit"
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
        >
          {challenge ? "Verify and sign in" : "Sign in"}
        </Button>
      </form>

      <a
        className="inline-flex min-h-touch items-center justify-center rounded-md border px-3 text-sm font-medium"
        href={googleSignInUrl(returnUrl)}
      >
        Continue with Google
      </a>
    </div>
  );
}
