import { createFileRoute } from "@tanstack/react-router";
import { FavouritesEditor } from "../../../features/registers/favourites/favourites-editor";

export const Route = createFileRoute(
  "/_authenticated/registers/$registerId/favourites",
)({
  component: FavouritesPage,
});

function FavouritesPage() {
  const { registerId } = Route.useParams();
  return <FavouritesEditor registerId={registerId} />;
}
