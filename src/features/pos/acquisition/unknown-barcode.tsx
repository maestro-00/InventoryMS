import { useState, type FormEvent } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { hasPermission } from "../../../shared/auth/access-policy";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  createProduct,
  productInputSchema,
  type ProductRecord,
} from "../../catalogue/products/api/products-api";
import type { CartProduct } from "../cart/cart-store";

export function UnknownBarcode({
  barcode,
  onCreated,
  onDismiss,
}: {
  barcode: string;
  onCreated: (product: CartProduct) => void;
  onDismiss: () => void;
}) {
  const { session } = useSession();
  const canCreate = hasPermission(session, "ManagePricing");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = productInputSchema.safeParse({
      name,
      sku,
      barcode,
      unitOfMeasure: "Each",
      allowFractional: false,
      sellingPrice,
      costPrice,
      trackingMode: "Simple",
    });
    if (!parsed.success) return;
    setPending(true);
    try {
      const product = await createProduct(parsed.data);
      onCreated(toCartProduct(product));
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-md border p-3"
      aria-label="Unknown barcode"
    >
      <p>No product matches this barcode ({barcode}).</p>
      {canCreate ? (
        creating ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => void submit(event)}
          >
            {toProblem(error) ? <ProblemSummary problem={toProblem(error)} /> : null}
            <TextField
              label="Product name"
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <TextField
              label="SKU"
              required
              value={sku}
              onChange={(event) => {
                setSku(event.target.value);
              }}
            />
            <TextField
              label="Selling price"
              required
              inputMode="decimal"
              value={sellingPrice}
              onChange={(event) => {
                setSellingPrice(event.target.value);
              }}
            />
            <TextField
              label="Cost price"
              required
              inputMode="decimal"
              value={costPrice}
              onChange={(event) => {
                setCostPrice(event.target.value);
              }}
            />
            <Button type="submit" disabled={pending}>
              Save product
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setCreating(true);
            }}
          >
            Create this product
          </Button>
        )
      ) : (
        <p>Ask a manager to add this barcode to the tenant catalogue.</p>
      )}
      <Button type="button" variant="outline" onClick={onDismiss}>
        Dismiss
      </Button>
    </section>
  );
}

function toCartProduct(product: ProductRecord): CartProduct {
  return {
    productId: product.id,
    productName: product.name,
    ...(product.barcode ? { barcode: product.barcode } : {}),
    allowFractional: product.allowFractional,
    catalogUnitPrice: product.sellingPrice,
    ...(product.taxTreatmentCode ? { taxTreatmentCode: product.taxTreatmentCode } : {}),
    status: product.status,
  };
}
