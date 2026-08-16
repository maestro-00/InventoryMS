import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "../api/staff-api";

export function AuditLogPanel() {
  const query = useQuery({
    queryKey: ["staff", "audit"],
    queryFn: () => fetchAuditLog(),
  });

  return (
    <section aria-label="Audit log" className="space-y-3">
      <h2>Sensitive audit history</h2>
      {query.isError ? <p role="alert">Failed to load audit log.</p> : null}
      <table>
        <caption>Paged audit entries</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Target</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {(query.data?.items ?? []).map((entry, index) => (
            <tr key={entry.id ?? index}>
              <td>{entry.occurredAt}</td>
              <td>{entry.actor ?? "—"}</td>
              <td>{entry.action}</td>
              <td>{entry.target ?? "—"}</td>
              <td>{entry.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
