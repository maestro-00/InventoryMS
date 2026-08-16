import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  fetchRoles,
  fetchStaffUsers,
  inviteStaff,
  staffScopeQueryPrefixes,
  updateStaffUser,
} from "../api/staff-api";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function StaffList() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["staff", "users"], queryFn: fetchStaffUsers });
  const roles = useQuery({ queryKey: ["staff", "roles"], queryFn: fetchRoles });
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [locationScope, setLocationScope] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: inviteStaff,
    onSuccess: async (result) => {
      setInviteToken(result.token ?? null);
      await queryClient.invalidateQueries({ queryKey: ["staff", "users"] });
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      roleId?: string;
      locationScope?: string;
      status?: string;
    }) => updateStaffUser(id, input),
    onSuccess: async () => {
      for (const prefix of staffScopeQueryPrefixes()) {
        await queryClient.invalidateQueries({ queryKey: [prefix] });
      }
    },
  });

  function submitInvite(event: FormEvent) {
    event.preventDefault();
    invite.mutate({
      email,
      ...(roleId ? { roleId } : {}),
      ...(locationScope ? { locationScope } : {}),
    });
  }

  const problem = toProblem(users.error ?? roles.error ?? invite.error ?? update.error);
  const plainError =
    !problem &&
    (users.error instanceof Error
      ? users.error
      : roles.error instanceof Error
        ? roles.error
        : invite.error instanceof Error
          ? invite.error
          : update.error instanceof Error
            ? update.error
            : null);
  const roleName = (id: string | null | undefined) =>
    roles.data?.find((role) => role.id === id)?.name ?? id ?? "—";

  return (
    <section aria-label="Staff" className="space-y-4">
      <h2>Staff</h2>
      <p>
        Cycle 1 roles are fixed: Owner, Administrator, Manager, Cashier, Accountant.
        Permissions and discount/refund ceilings come from InventoryX.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {plainError ? <p role="alert">{plainError.message}</p> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submitInvite}>
        <TextField
          label="Invite email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <SelectField
          label="Role"
          value={roleId}
          options={[
            { value: "", label: "Select role" },
            ...(roles.data ?? []).map((role) => ({
              value: role.id,
              label: `${role.name}${role.permissions ? ` · ${role.permissions}` : ""}`,
            })),
          ]}
          onChange={(event) => {
            setRoleId(event.target.value);
          }}
        />
        <TextField
          label="Location scope"
          value={locationScope}
          onChange={(event) => {
            setLocationScope(event.target.value);
          }}
          hint="Comma-separated location IDs; blank means all allowed locations"
        />
        <Button type="submit" disabled={invite.isPending}>
          Send invitation
        </Button>
      </form>
      {inviteToken ? (
        <p role="status">Invitation token issued for accept flow.</p>
      ) : null}
      <ul className="space-y-3">
        {(users.data ?? []).map((user) => (
          <li key={user.id}>
            <p>
              {user.email ?? user.id} · {roleName(user.roleId)} · {user.status}
              {user.isOwner ? " · Owner" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Scope: {user.locationScope || "all"} · Active:{" "}
              {user.status === "Active" ? "yes" : "no"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (!window.confirm("Deactivate this user?")) return;
                  update.mutate({ id: user.id, status: "Inactive" });
                }}
              >
                Deactivate
              </Button>
              <Button
                type="button"
                onClick={() => {
                  update.mutate({
                    id: user.id,
                    locationScope: "33333333-3333-4333-8333-333333333333",
                  });
                }}
              >
                Scope to Main Shop
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
