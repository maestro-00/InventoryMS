import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/inventory/")({
  component: InventoryIndexPage,
});

const LINKS = [
  { to: "/inventory/stock", label: "Stock levels" },
  { to: "/inventory/movements", label: "Movements" },
  { to: "/inventory/adjustments", label: "Adjustments" },
  { to: "/inventory/transfers", label: "Transfers" },
  { to: "/inventory/counts", label: "Counts" },
  { to: "/inventory/consumption", label: "Internal consumption" },
  { to: "/inventory/alerts", label: "Alerts" },
  { to: "/inventory/reorder", label: "Reorder suggestions" },
  { to: "/inventory/opening-stock", label: "Opening stock" },
] as const;

function InventoryIndexPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p>Stock, movements, transfers, counts, and alerts for this business.</p>
      <ul className="flex flex-col gap-2">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link className="underline" to={item.to}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
