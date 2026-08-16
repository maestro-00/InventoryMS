import { createFileRoute } from "@tanstack/react-router";
import { StaffList } from "../../../features/staff/users/staff-list";
import { RegisterPinForm } from "../../../features/staff/register-pin/register-pin-form";
import { AuditLogPanel } from "../../../features/staff/audit-log/audit-log-panel";
import { useSession } from "../../../shared/auth/session-context";

export const Route = createFileRoute("/_authenticated/staff/")({
  beforeLoad: ({ context }) => {
    const permissions = context.session?.permissions ?? [];
    if (
      !permissions.includes("ManageUsers") &&
      context.session?.role !== "Owner" &&
      context.session?.role !== "Administrator"
    ) {
      throw new Error("Staff administration requires ManageUsers");
    }
  },
  component: StaffPage,
});

function StaffPage() {
  const { session } = useSession();
  const userId = session?.userId ?? "";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <h1>Staff administration</h1>
      <StaffList />
      {userId ? <RegisterPinForm userId={userId} /> : null}
      <AuditLogPanel />
    </main>
  );
}
