import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import type { ReportFilter, ReportKind } from "../api/reports-api";

export function ReportFilters({
  kind,
  filter,
  onKindChange,
  onFilterChange,
  locations,
}: {
  kind: ReportKind;
  filter: ReportFilter;
  onKindChange: (kind: ReportKind) => void;
  onFilterChange: (filter: ReportFilter) => void;
  locations: Array<{ id: string; name: string }>;
}) {
  return (
    <form
      aria-label="Report filters"
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <SelectField
        label="Report"
        value={kind}
        options={[
          { value: "sales", label: "Sales" },
          { value: "profit", label: "Profit" },
          { value: "stock", label: "Stock" },
          { value: "purchasing", label: "Purchasing" },
          { value: "staff", label: "Staff" },
          { value: "tax", label: "Ghana tax" },
        ]}
        onChange={(event) => {
          onKindChange(event.target.value as ReportKind);
        }}
      />
      <TextField
        label="From"
        type="date"
        required
        value={filter.from.slice(0, 10)}
        onChange={(event) => {
          onFilterChange({
            ...filter,
            from: new Date(event.target.value).toISOString(),
          });
        }}
      />
      <TextField
        label="To"
        type="date"
        required
        value={filter.to.slice(0, 10)}
        onChange={(event) => {
          onFilterChange({ ...filter, to: new Date(event.target.value).toISOString() });
        }}
      />
      <SelectField
        label="Location"
        value={filter.locationId ?? ""}
        options={[
          { value: "", label: "All locations" },
          ...locations.map((location) => ({
            value: location.id,
            label: location.name,
          })),
        ]}
        onChange={(event) => {
          const locationId = event.target.value;
          const next = { ...filter };
          if (locationId) next.locationId = locationId;
          else delete next.locationId;
          onFilterChange(next);
        }}
      />
    </form>
  );
}
