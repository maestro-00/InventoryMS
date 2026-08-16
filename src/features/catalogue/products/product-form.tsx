import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { AppProblem } from "../../../shared/api/errors/app-problem";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { PRODUCT_STEP } from "../../onboarding/completion";
import { useMarkOnboardingStep } from "../../onboarding/mark-onboarding-step";
import { fetchCategories } from "../categories/api/categories-api";
import { flattenCategories } from "../categories/category-tree";
import {
  createProduct,
  fetchTaxTreatments,
  productInputSchema,
  TRACKING_MODES,
  type ProductRecord,
  type TrackingMode,
} from "./api/products-api";

interface VariantDraft {
  attributeValues: Record<string, string>;
  sku: string;
}

function fieldError(problem: AppProblem | null, field: string): string | undefined {
  if (!problem) return undefined;
  const key = Object.keys(problem.fieldErrors).find(
    (candidate) => candidate.toLowerCase() === field.toLowerCase(),
  );
  return key ? problem.fieldErrors[key]?.join(" ") : undefined;
}

function parseAttributes(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function ProductForm({
  onCreated,
}: {
  onCreated: (product: ProductRecord) => void;
}) {
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const taxTreatments = useQuery({
    queryKey: ["tax-treatments"],
    queryFn: fetchTaxTreatments,
  });

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxTreatmentCode, setTaxTreatmentCode] = useState("");
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("Simple");
  const [attributesRaw, setAttributesRaw] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const markOnboardingStep = useMarkOnboardingStep();
  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "products" || query.queryKey[0] === "pos-products",
      });
      markOnboardingStep(PRODUCT_STEP);
      onCreated(product);
    },
  });

  const attributes = parseAttributes(attributesRaw);

  const categoryOptions = [
    { value: "", label: "No category" },
    ...flattenCategories(categories.data ?? []).map((category) => ({
      value: category.id,
      label: `${"— ".repeat(category.depth)}${category.name}`,
    })),
  ];
  const taxOptions = [
    { value: "", label: "No tax treatment" },
    ...(taxTreatments.data ?? []).map((treatment) => ({
      value: treatment.code,
      label: treatment.name,
    })),
  ];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = productInputSchema.safeParse({
      name,
      sku,
      ...(barcode.trim() === "" ? {} : { barcode }),
      unitOfMeasure: "Each",
      allowFractional: false,
      sellingPrice,
      costPrice,
      ...(categoryId ? { categoryId } : {}),
      ...(taxTreatmentCode ? { taxTreatmentCode } : {}),
      trackingMode,
      ...(trackingMode === "Variant"
        ? {
            variantAttributes: attributes,
            variants: variants.map((variant) => ({
              attributeValues: variant.attributeValues,
              ...(variant.sku ? { sku: variant.sku } : {}),
            })),
          }
        : {}),
    });
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    mutation.mutate(parsed.data);
  }

  const problem = toProblem(mutation.error);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the highlighted fields"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <SelectField
        label="Tracking mode"
        options={TRACKING_MODES.map((mode) => ({ value: mode, label: mode }))}
        value={trackingMode}
        onChange={(event) => {
          setTrackingMode(event.target.value as TrackingMode);
        }}
      />
      <TextField
        label="Product name"
        required
        value={name}
        error={fieldError(problem, "name")}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      <TextField
        label="SKU"
        required
        value={sku}
        error={fieldError(problem, "sku")}
        onChange={(event) => {
          setSku(event.target.value);
        }}
      />
      <TextField
        label="Barcode"
        value={barcode}
        error={fieldError(problem, "barcode")}
        onChange={(event) => {
          setBarcode(event.target.value);
        }}
      />
      <TextField
        label="Selling price"
        required
        inputMode="decimal"
        hint="Tax-inclusive price as configured in InventoryX."
        value={sellingPrice}
        error={fieldError(problem, "sellingPrice")}
        onChange={(event) => {
          setSellingPrice(event.target.value);
        }}
      />
      <TextField
        label="Cost price"
        required
        inputMode="decimal"
        value={costPrice}
        error={fieldError(problem, "costPrice")}
        onChange={(event) => {
          setCostPrice(event.target.value);
        }}
      />
      <SelectField
        label="Category"
        options={categoryOptions}
        value={categoryId}
        onChange={(event) => {
          setCategoryId(event.target.value);
        }}
      />
      <SelectField
        label="Tax treatment"
        options={taxOptions}
        value={taxTreatmentCode}
        onChange={(event) => {
          setTaxTreatmentCode(event.target.value);
        }}
      />

      {trackingMode === "Variant" ? (
        <fieldset className="flex flex-col gap-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Variants</legend>
          <TextField
            label="Variant attributes"
            hint="Comma separated, for example: Size, Colour"
            value={attributesRaw}
            onChange={(event) => {
              setAttributesRaw(event.target.value);
            }}
          />
          {variants.map((variant, index) => (
            <div
              // Variant drafts have no server identity until the product is created.
              key={`variant-${String(index)}`}
              role="group"
              aria-label={`Variant ${String(index + 1)}`}
              className="flex flex-col gap-2 rounded-md border p-3"
            >
              {attributes.map((attribute) => (
                <TextField
                  key={attribute}
                  label={attribute}
                  value={variant.attributeValues[attribute] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setVariants((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              attributeValues: {
                                ...item.attributeValues,
                                [attribute]: value,
                              },
                            }
                          : item,
                      ),
                    );
                  }}
                />
              ))}
              <TextField
                label="SKU"
                value={variant.sku}
                onChange={(event) => {
                  const value = event.target.value;
                  setVariants((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, sku: value } : item,
                    ),
                  );
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setVariants((current) => [...current, { attributeValues: {}, sku: "" }]);
            }}
          >
            Add variant
          </Button>
        </fieldset>
      ) : null}

      {trackingMode === "Batch" ? (
        <fieldset className="flex flex-col gap-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Batch tracking</legend>
          <p>
            Batch details are captured when goods are received, so they stay empty here.
          </p>
          <TextField label="Manufacture date" type="date" disabled />
          <TextField label="Expiry date" type="date" disabled />
        </fieldset>
      ) : null}

      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        {mutation.isPending ? "Saving product…" : "Save product"}
      </Button>
    </form>
  );
}
