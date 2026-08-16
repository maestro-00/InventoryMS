import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    await context.sessionManager.whenRestored();
    // TanStack Router uses thrown redirects as control flow.
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
    throw redirect({
      to: context.sessionManager.getSnapshot() ? "/dashboard" : "/login",
    });
  },
});
