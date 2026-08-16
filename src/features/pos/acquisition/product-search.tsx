import { useEffect, useState } from "react";
import { fetchProducts } from "../../catalogue/products/api/products-api";
import type { CartProduct } from "../cart/cart-store";

export function ProductSearch({ onAdd }: { onAdd: (product: CartProduct) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CartProduct[]>([]);
  const open = term.trim() !== "" && results.length > 0;

  useEffect(() => {
    if (term.trim() === "") return;
    const handle = window.setTimeout(() => {
      void fetchProducts({ search: term, pageSize: 20 }).then((page) => {
        setResults(
          page.items.map((product) => ({
            productId: product.id,
            productName: product.name,
            ...(product.barcode ? { barcode: product.barcode } : {}),
            allowFractional: product.allowFractional,
            catalogUnitPrice: product.sellingPrice,
            ...(product.taxTreatmentCode
              ? { taxTreatmentCode: product.taxTreatmentCode }
              : {}),
            status: product.status,
          })),
        );
      });
    }, 150);
    return () => {
      window.clearTimeout(handle);
    };
  }, [term]);

  const visible = term.trim() === "" ? [] : results;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        role="combobox"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="product-search-results"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
        }}
      />
      {visible.length > 0 ? (
        <div id="product-search-results" role="listbox" className="rounded-md border">
          {visible.map((product) => (
            <button
              key={product.productId}
              type="button"
              role="option"
              aria-selected={false}
              className="w-full px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                onAdd(product);
                setTerm("");
                setResults([]);
              }}
            >
              {product.productName}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
