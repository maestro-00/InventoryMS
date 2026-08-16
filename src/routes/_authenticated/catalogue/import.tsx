import { createFileRoute } from "@tanstack/react-router";
import { ImportWizard } from "../../../features/catalogue/import/import-wizard";

export const Route = createFileRoute("/_authenticated/catalogue/import")({
  component: ImportPage,
});

function ImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Import products</h1>
      <ImportWizard />
    </div>
  );
}
