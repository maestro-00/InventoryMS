import { createFileRoute } from "@tanstack/react-router";
import { FeaturesPage } from "../features/marketing/features/features-page";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});
