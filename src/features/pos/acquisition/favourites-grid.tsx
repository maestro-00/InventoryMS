import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/ui/button";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import type { ProductRecord } from "../../catalogue/products/api/products-api";
import { fetchFavouritesLayout } from "../../registers/favourites/api/favourites-api";
import type { CartProduct } from "../cart/cart-store";

export function FavouritesGrid({
  registerId,
  products,
  onAdd,
}: {
  registerId: string;
  products: ProductRecord[];
  onAdd: (product: CartProduct) => void;
}) {
  const layout = useQuery({
    queryKey: ["favourites", registerId],
    queryFn: () => fetchFavouritesLayout(registerId),
  });

  if (layout.isPending) return <LoadingState label="Loading favourites" />;

  const byId = new Map(products.map((product) => [product.id, product]));
  const ids =
    layout.data !== undefined && layout.data.pages.length > 0
      ? layout.data.pages.flatMap((page) => page.productIds)
      : products.map((product) => product.id);
  const unique = [...new Set(ids)];

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Favourites">
      {unique.map((productId) => {
        const product = byId.get(productId);
        if (!product) return null;
        return (
          <li key={product.id}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onAdd({
                  productId: product.id,
                  productName: product.name,
                  ...(product.barcode ? { barcode: product.barcode } : {}),
                  allowFractional: product.allowFractional,
                  catalogUnitPrice: product.sellingPrice,
                  ...(product.taxTreatmentCode
                    ? { taxTreatmentCode: product.taxTreatmentCode }
                    : {}),
                  status: product.status,
                });
              }}
            >
              Add {product.name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
