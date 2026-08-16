import { createFileRoute } from "@tanstack/react-router";
import { CategoryMaintenance } from "../../../features/catalogue/categories/category-maintenance";

export const Route = createFileRoute("/_authenticated/catalogue/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  return <CategoryMaintenance />;
}
