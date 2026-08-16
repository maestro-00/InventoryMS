import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationForm } from "../../features/staff/invitations/accept-invitation-form";

type InviteSearch = {
  userId?: string;
  token?: string;
};

export const Route = createFileRoute("/invite/accept")({
  validateSearch: (search: Record<string, unknown>): InviteSearch => {
    const next: InviteSearch = {};
    if (typeof search.userId === "string") next.userId = search.userId;
    if (typeof search.token === "string") next.token = search.token;
    return next;
  },
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const search = Route.useSearch();
  return (
    <main id="main-content" className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      {search.userId && search.token ? (
        <AcceptInvitationForm userId={search.userId} token={search.token} />
      ) : (
        <p role="alert">Invitation link is missing userId or token.</p>
      )}
    </main>
  );
}
