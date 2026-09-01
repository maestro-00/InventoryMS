import { createFileRoute, redirect } from "@tanstack/react-router";

/** Public plan comparison moved to marketing `/pricing`; billing management is under settings. */
export const Route = createFileRoute("/plans")({
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
    throw redirect({ to: "/pricing" });
  },
});
