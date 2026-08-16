import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProductForm } from "../../../features/catalogue/products/product-form";
import { ProductList } from "../../../features/catalogue/products/product-list";
import { Button } from "../../../shared/ui/button";

export const Route = createFileRoute("/_authenticated/catalogue/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button
          type="button"
          onClick={() => {
            setCreating((current) => !current);
          }}
        >
          {creating ? "Close the product form" : "Add a product"}
        </Button>
      </div>

      {creating ? (
        <ProductForm
          onCreated={() => {
            setCreating(false);
          }}
        />
      ) : null}

      <ProductList
        onCreate={() => {
          setCreating(true);
        }}
      />
    </div>
  );
}
