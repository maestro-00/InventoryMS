import { Link, createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationForm } from "../../features/staff/invitations/accept-invitation-form";
import { PublicAuthLayout } from "../../features/marketing/layout/public-auth-layout";
import { MarketingBrand } from "../../features/marketing/shared/marketing-brand";

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

  if (!search.userId || !search.token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6">
        <MarketingBrand tone="light" />
        <p role="alert" className="text-sm text-destructive">
          Invitation link is missing userId or token.
        </p>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Sign in instead
        </Link>
      </div>
    );
  }

  return (
    <PublicAuthLayout
      leftContent={
        <div>
          <h2 className="mb-4 text-3xl font-bold leading-tight text-navy-foreground">
            Join your team on{" "}
            <span className="text-primary">InventoryMS</span>
          </h2>
          <p className="text-sm leading-relaxed text-navy-foreground/70">
            Set a password to accept your invitation and access your business
            account.
          </p>
        </div>
      }
      rightContent={
        <>
          <h1 className="mb-1 text-2xl font-bold text-foreground">
            Accept invitation
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Choose a password for your new account.
          </p>
          <AcceptInvitationForm userId={search.userId} token={search.token} />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in instead
            </Link>
          </p>
        </>
      }
    />
  );
}
