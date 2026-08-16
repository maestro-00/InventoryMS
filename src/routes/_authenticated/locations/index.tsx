import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LocationForm } from "../../../features/inventory/locations/location-form";
import { LocationList } from "../../../features/inventory/locations/location-list";

export const Route = createFileRoute("/_authenticated/locations/")({
  component: LocationsPage,
});

function LocationsPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <section className="flex-1">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <LocationList
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={() => {
            document.getElementById("new-location")?.scrollIntoView();
          }}
        />
      </section>
      <section id="new-location" className="w-full lg:w-96">
        <h2 className="text-lg font-semibold">Add a location</h2>
        <LocationForm
          onSaved={(saved) => {
            setSelectedId(saved.id);
          }}
        />
      </section>
    </div>
  );
}
