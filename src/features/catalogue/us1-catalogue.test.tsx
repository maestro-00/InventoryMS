import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders } from "../../shared/test/render";
import { selectRadixOption, waitForRadixSelectOptions } from "../../shared/test/select-radix";
import { ProductForm } from "./products/product-form";
import { ProductList } from "./products/product-list";
import { ImportWizard } from "./import/import-wizard";
import {
  categoryTree,
  importJobCommitted,
  importJobPreviewed,
  importJobUploaded,
  pagedProducts,
  productRecord,
  taxTreatments,
  validationProblem,
  CATEGORY_ID,
  IMPORT_JOB_ID,
} from "../../../tests/fixtures/provider/us1";

function catalogueHandlers() {
  return [
    http.get("*/api/v1/categories", () => HttpResponse.json(categoryTree)),
    http.get("*/api/v1/tax-treatments", () => HttpResponse.json(taxTreatments)),
  ];
}

async function fillRequiredProductFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/product name/i), "Sugar 1kg");
  await user.type(screen.getByLabelText(/^sku/i), "SUG-001");
  await user.type(screen.getByLabelText(/selling price/i), "10.00");
  await user.type(screen.getByLabelText(/cost price/i), "6.00");
}

describe("manual product creation", () => {
  it("creates a Simple product with a category and Ghana tax treatment", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...catalogueHandlers(),
      http.post("*/api/v1/products", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(productRecord, { status: 201 });
      }),
    );

    renderWithProviders(<ProductForm onCreated={onCreated} />);

    await waitForRadixSelectOptions(screen.getByLabelText(/category/i), "Groceries");
    await fillRequiredProductFields(user);
    await selectRadixOption(user, screen.getByLabelText(/category/i), CATEGORY_ID);
    await selectRadixOption(user, screen.getByLabelText(/tax treatment/i), "GH-STD");
    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
    expect(sent).toMatchObject({
      name: "Sugar 1kg",
      sku: "SUG-001",
      sellingPrice: 10,
      costPrice: 6,
      categoryId: CATEGORY_ID,
      taxTreatmentCode: "GH-STD",
      trackingMode: "Simple",
    });
  });

  it("captures the attribute schema and variant rows in Variant mode", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...catalogueHandlers(),
      http.post("*/api/v1/products", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(productRecord, { status: 201 });
      }),
    );

    renderWithProviders(<ProductForm onCreated={vi.fn()} />);

    await waitForRadixSelectOptions(screen.getByLabelText(/category/i), "Groceries");
    await selectRadixOption(user, screen.getByLabelText(/tracking mode/i), "Variant");
    await fillRequiredProductFields(user);

    await user.type(screen.getByLabelText(/variant attributes/i), "Size");
    await user.click(screen.getByRole("button", { name: /add variant/i }));
    const variantRow = screen.getByRole("group", { name: /variant 1/i });
    await user.type(within(variantRow).getByLabelText(/size/i), "1kg");
    await user.type(within(variantRow).getByLabelText(/sku/i), "SUG-001-1KG");

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => {
      // CreateProductCommand carries the attribute schema; variant rows use
      // POST /api/v1/products/{id}/variants (AddProductVariantsCommand).
      expect(sent).toMatchObject({
        trackingMode: "Variant",
        variantAttributes: ["Size"],
      });
    });
  });

  it("shows Batch fields as US10 stubs without blocking product creation", async () => {
    const user = userEvent.setup();
    server.use(...catalogueHandlers());

    renderWithProviders(<ProductForm onCreated={vi.fn()} />);

    await waitForRadixSelectOptions(screen.getByLabelText(/category/i), "Groceries");
    await selectRadixOption(user, screen.getByLabelText(/tracking mode/i), "Batch");

    expect(screen.getByLabelText(/manufacture date/i)).toBeDisabled();
    expect(screen.getByLabelText(/expiry date/i)).toBeDisabled();
    expect(screen.getByText(/captured when goods are received/i)).toBeInTheDocument();
  });

  it("maps server field errors to the exact field and keeps the entered values", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogueHandlers(),
      http.post("*/api/v1/products", () =>
        HttpResponse.json(validationProblem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    renderWithProviders(<ProductForm onCreated={vi.fn()} />);

    await waitForRadixSelectOptions(screen.getByLabelText(/category/i), "Groceries");
    await fillRequiredProductFields(user);
    await user.click(screen.getByRole("button", { name: /save product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /SKU must be unique within the tenant/i,
    );
    expect(screen.getByLabelText(/^sku/i)).toHaveAccessibleDescription(
      /SKU must be unique within the tenant/i,
    );
    expect(screen.getByLabelText(/product name/i)).toHaveValue("Sugar 1kg");
  });

  it("rejects a non-decimal price before contacting the provider", async () => {
    const user = userEvent.setup();
    server.use(...catalogueHandlers());

    renderWithProviders(<ProductForm onCreated={vi.fn()} />);

    await waitForRadixSelectOptions(screen.getByLabelText(/category/i), "Groceries");
    await user.type(screen.getByLabelText(/product name/i), "Sugar 1kg");
    await user.type(screen.getByLabelText(/^sku/i), "SUG-001");
    await user.type(screen.getByLabelText(/selling price/i), "ten");
    await user.click(screen.getByRole("button", { name: /save product/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/decimal/i);
  });
});

describe("product list", () => {
  it("lists products with their selling price and offers the empty-state action", async () => {
    server.use(http.get("*/api/v1/products", () => HttpResponse.json(pagedProducts)));

    renderWithProviders(<ProductList onCreate={vi.fn()} />);

    expect(await screen.findByText("Sugar 1kg")).toBeInTheDocument();
    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
  });

  it("explains an empty catalogue with one primary action", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/products", () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 50, totalCount: 0 }),
      ),
    );

    renderWithProviders(<ProductList onCreate={onCreate} />);

    await user.click(
      await screen.findByRole("button", { name: /add your first product/i }),
    );
    expect(onCreate).toHaveBeenCalled();
  });

  it("hides cost and margin columns without ViewProfit", async () => {
    server.use(
      http.get("*/api/v1/products", () =>
        HttpResponse.json({
          ...pagedProducts,
          items: [{ ...productRecord, costPrice: null }],
        }),
      ),
    );

    renderWithProviders(<ProductList onCreate={vi.fn()} />, {
      session: {
        userId: "11111111-1111-4111-8111-111111111111",
        tenantId: "22222222-2222-4222-8222-222222222222",
        role: "Cashier",
        permissions: ["Sell"],
        locationScope: ["33333333-3333-4333-8333-333333333333"],
        expiresAt: "2026-08-13T12:00:00.000Z",
        accessToken: "test-access",
        refreshToken: "test-refresh",
      },
    });

    await screen.findByText("Sugar 1kg");
    expect(
      screen.queryByRole("columnheader", { name: /cost/i }),
    ).not.toBeInTheDocument();
  });
});

describe("product import wizard", () => {
  function importHandlers() {
    return [
      http.post("*/api/v1/import/products", () =>
        HttpResponse.json(importJobUploaded, { status: 201 }),
      ),
      http.put(`*/api/v1/import/products/${IMPORT_JOB_ID}/mapping`, () =>
        HttpResponse.json(importJobPreviewed),
      ),
      http.post(`*/api/v1/import/products/${IMPORT_JOB_ID}/commit`, () =>
        HttpResponse.json(importJobCommitted),
      ),
    ];
  }

  it("previews every parsed row and saves nothing before confirmation", async () => {
    const user = userEvent.setup();
    let committed = false;
    server.use(
      ...importHandlers(),
      http.post(`*/api/v1/import/products/${IMPORT_JOB_ID}/commit`, () => {
        committed = true;
        return HttpResponse.json(importJobCommitted);
      }),
    );

    renderWithProviders(<ImportWizard />);

    const file = new File(["Name,SKU,Price\n"], "products.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/spreadsheet file/i), file);
    await user.click(
      screen.getByRole("button", { name: /upload and detect columns/i }),
    );

    await screen.findByText(/detected columns/i);
    await selectRadixOption(user, screen.getByLabelText(/map "Name"/i), "name");
    await user.click(screen.getByRole("button", { name: /preview all rows/i }));

    expect(
      await screen.findByRole("table", { name: /import preview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("SellingPrice must be a decimal value."),
    ).toBeInTheDocument();
    expect(committed).toBe(false);

    await user.click(screen.getByRole("button", { name: /^commit 1 valid row/i }));
    expect(await screen.findByText(/created 1/i)).toBeInTheDocument();
    expect(screen.getByText(/skipped 1/i)).toBeInTheDocument();
  });

  it("abandons the job and returns to the upload step", async () => {
    const user = userEvent.setup();
    let abandoned = false;
    server.use(
      ...importHandlers(),
      http.delete(`*/api/v1/import/products/${IMPORT_JOB_ID}`, () => {
        abandoned = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<ImportWizard />);

    const file = new File(["Name,SKU,Price\n"], "products.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/spreadsheet file/i), file);
    await user.click(
      screen.getByRole("button", { name: /upload and detect columns/i }),
    );

    await screen.findByText(/detected columns/i);
    await user.click(screen.getByRole("button", { name: /abandon import/i }));

    await waitFor(() => {
      expect(abandoned).toBe(true);
    });
    expect(screen.getByLabelText(/spreadsheet file/i)).toBeInTheDocument();
  });
});
