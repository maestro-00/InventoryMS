import { createFileRoute } from "@tanstack/react-router";
import { PosWorkspace } from "../../features/pos/pos-workspace";

export const Route = createFileRoute("/_authenticated/pos")({
  component: PosPage,
});

function PosPage() {
  return <PosWorkspace />;
}
