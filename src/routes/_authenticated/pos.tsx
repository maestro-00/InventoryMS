import { createFileRoute } from "@tanstack/react-router";
import { PosWorkspace } from "../../features/pos/pos-workspace";

type PosSearch = {
  shiftId?: string;
};

export const Route = createFileRoute("/_authenticated/pos")({
  validateSearch: (search: Record<string, unknown>): PosSearch => {
    const next: PosSearch = {};
    if (typeof search.shiftId === "string" && search.shiftId.trim() !== "") {
      next.shiftId = search.shiftId;
    }
    return next;
  },
  component: PosPage,
});

function PosPage() {
  const { shiftId } = Route.useSearch();
  return shiftId ? <PosWorkspace preferredShiftId={shiftId} /> : <PosWorkspace />;
}
