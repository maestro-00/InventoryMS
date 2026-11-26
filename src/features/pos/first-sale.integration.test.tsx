import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithRouter } from "../../shared/test/render-router";
import { waitForRadixSelectOptions } from "../../shared/test/select-radix";
import { PosWorkspace } from "./pos-workspace";
import {
  completedSale,
  locationRecord,
  pagedProducts,
  receiptRecord,
  registerRecord,
  shiftRecord,
  stockLevel,
  stockLevelAfterSale,
  taxTreatments,
  LOCATION_ID,
  SALE_ID,
} from "../../../tests/fixtures/provider/us1";
import * as us2 from "../../../tests/fixtures/provider/us2";

function posHandlers(options: { registers?: unknown[]; openShifts?: unknown[] } = {}) {
  return [
    http.get("*/api/v1/locations", () => HttpResponse.json([locationRecord])),
    http.get("*/api/v1/registers", () =>
      HttpResponse.json(options.registers ?? [registerRecord]),
    ),
    http.get("*/api/v1/shifts", ({ request }) => {
      const status = new URL(request.url).searchParams.get("status");
      if (status && status !== "Open") return HttpResponse.json([]);
      return HttpResponse.json(options.openShifts ?? []);
    }),
    http.get("*/api/v1/products", () => HttpResponse.json(pagedProducts)),
    http.get("*/api/v1/tax-treatments", () => HttpResponse.json(taxTreatments)),
    http.post("*/api/v1/registers/:registerId/shifts", () =>
      HttpResponse.json(shiftRecord, { status: 201 }),
    ),
    http.get(`*/api/v1/sales/${SALE_ID}/receipt`, () =>
      HttpResponse.json(receiptRecord),
    ),
    http.get("*/api/v1/sales", () =>
      HttpResponse.json({
        items: [completedSale],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      }),
    ),
  ];
}

async function openTheShift(user: ReturnType<typeof userEvent.setup>) {
  const registerField = await screen.findByLabelText(/^register/i);
  await waitForRadixSelectOptions(registerField, /counter 1/i);
  await user.clear(screen.getByLabelText(/opening float/i));
  await user.type(screen.getByLabelText(/opening float/i), "100.00");
  await user.click(screen.getByRole("button", { name: /open shift/i }));
}

async function ringUpTwoUnits(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /add sugar 1kg/i }));
  await user.clear(screen.getByLabelText(/quantity for sugar 1kg/i));
  await user.type(screen.getByLabelText(/quantity for sugar 1kg/i), "2");
  await user.clear(screen.getByLabelText(/cash received/i));
  await user.type(screen.getByLabelText(/cash received/i), "25.00");
}

describe("online first sale", () => {
  it("clears a cash-only error when switching to a card payment", async () => {
    const user = userEvent.setup();
    let payments: Array<{ tender: string; amount: number }> = [];
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as {
          payments: Array<{ tender: string; amount: number }>;
        };
        payments = body.payments;
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await user.click(await screen.findByRole("button", { name: /add sugar 1kg/i }));
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    expect(
      screen.getAllByText(/enter the cash received from the customer/i).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /add card tender/i }));
    expect(
      screen.queryByText(/enter the cash received from the customer/i),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/card amount/i), "25.00");
    await user.type(screen.getByLabelText(/card reference/i), "AUTH-25");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));

    await screen.findByText(/receipt rcp-000001/i);
    expect(payments).toEqual([{ tender: "Card", amount: 25, reference: "AUTH-25" }]);
  });

  it("sends a 5% discount as 0.50 off a 10.00 item", async () => {
    const user = userEvent.setup();
    let discount: number | undefined;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as {
          lines: Array<{ lineDiscount: number }>;
        };
        discount = body.lines[0]?.lineDiscount;
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await user.click(await screen.findByRole("button", { name: /add sugar 1kg/i }));
    await user.clear(screen.getByLabelText(/discount.*sugar 1kg/i));
    await user.type(screen.getByLabelText(/discount.*sugar 1kg/i), "5");
    expect(screen.getByText(/0.50 off this line/i)).toBeInTheDocument();
    expect(screen.getByText(/10.00 each/i)).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Sale summary" });
    expect(await within(summary).findByText(/10.92/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/cash received/i), "25.00");
    expect(screen.getByText(/change to give/i)).toBeInTheDocument();
    expect(screen.getByText(/14.08/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    await screen.findByText(/receipt rcp-000001/i);
    expect(discount).toBe(0.5);
  });

  it("blocks cash and split payment when requested quantity exceeds stock", async () => {
    const user = userEvent.setup();
    let available = 0;
    let posts = 0;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", ({ request }) => {
        const pageSize = Number(
          new URL(request.url).searchParams.get("pageSize") ?? 50,
        );
        return HttpResponse.json({
          items: [{ ...stockLevel, qtyOnHand: available }],
          page: 1,
          pageSize,
          totalCount: 1,
        });
      }),
      http.post("*/api/v1/sales", () => {
        posts += 1;
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    expect(
      (await screen.findAllByText(/Sugar 1kg: 0 available, 2 requested/)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText(/quantity for sugar 1kg/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(posts).toBe(0);

    await user.type(screen.getByLabelText(/cash amount/i), "25.00");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));
    expect(
      (await screen.findAllByText(/Sugar 1kg: 0 available, 2 requested/)).length,
    ).toBeGreaterThan(0);
    expect(posts).toBe(0);

    available = 1;
    await user.clear(screen.getByLabelText(/quantity for sugar 1kg/i));
    await user.type(screen.getByLabelText(/quantity for sugar 1kg/i), "1");
    expect(screen.getByLabelText(/quantity for sugar 1kg/i)).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    expect(await screen.findByText(/receipt rcp-000001/i)).toBeInTheDocument();
    expect(posts).toBe(1);
  });

  it("shows a payment validation error beside cash without losing the sale", async () => {
    const user = userEvent.setup();
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(
          {
            title: "One or more validation errors occurred.",
            status: 400,
            errors: { "Payments[0].Amount": ["Enter an amount greater than zero."] },
            traceId: "sale-trace",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Payment amount: Enter an amount greater than zero.",
    );
    expect(screen.getByLabelText(/cash received/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/cash received/i)).toHaveValue("25.00");
    expect(screen.getByText(/sale-trace/i)).toBeInTheDocument();
  });

  it("keeps the completed sale visible when its receipt fails to load", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`*/api/v1/sales/${SALE_ID}/receipt`, () =>
        HttpResponse.json(
          { title: "Receipt unavailable", status: 503 },
          { status: 503 },
        ),
      ),
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(completedSale, { status: 201 }),
      ),
    );
    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByText("Sale completed")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /receipt could not be loaded/i,
    );
    expect(
      screen.getByRole("button", { name: /try loading receipt again/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /start a new sale/i })).toBeEnabled();
  });

  it("blocks selling until a shift is open, then completes the sale with server totals", async () => {
    const user = userEvent.setup();
    let saleBody: Record<string, unknown> | null = null;
    let stockCalls = 0;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () => {
        stockCalls += 1;
        return HttpResponse.json({
          items: [stockCalls === 1 ? stockLevel : stockLevelAfterSale],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        });
      }),
      http.post("*/api/v1/sales", async ({ request }) => {
        saleBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);

    expect(await screen.findByText(/before you can sell/i)).toBeInTheDocument();

    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByText(/receipt rcp-000001/i)).toBeInTheDocument();
    expect(saleBody).toMatchObject({
      lines: [{ productId: pagedProducts.items[0]?.id, qty: 2 }],
      payments: [{ tender: "Cash", amount: 25 }],
    });
    // Totals are rendered exactly as InventoryX returned them.
    expect(screen.getByText(/23\.00/)).toBeInTheDocument();
    expect(screen.getByText(/2\.00/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/8 on hand/i)).toBeInTheDocument();
    });
  });

  it("submits one sale for a double-clicked payment button", async () => {
    const user = userEvent.setup();
    let posts = 0;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", async () => {
        posts += 1;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);

    await openTheShift(user);
    await ringUpTwoUnits(user);
    const payButton = screen.getByRole("button", { name: /take cash payment/i });
    await user.dblClick(payButton);

    await screen.findByText(/receipt rcp-000001/i);
    expect(posts).toBe(1);
  });

  it("reuses the same clientSaleId when the first attempt fails and is retried", async () => {
    const user = userEvent.setup();
    const clientSaleIds: unknown[] = [];
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as { clientSaleId: string };
        clientSaleIds.push(body.clientSaleId);
        if (clientSaleIds.length === 1) {
          return HttpResponse.json(
            { title: "Service unavailable", status: 503 },
            { status: 503, headers: { "Content-Type": "application/problem+json" } },
          );
        }
        return HttpResponse.json(completedSale, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);

    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/service unavailable/i);

    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    await screen.findByText(/receipt rcp-000001/i);

    expect(clientSaleIds).toHaveLength(2);
    expect(clientSaleIds[0]).toBe(clientSaleIds[1]);
  });

  it("creates the first register when the location has none", async () => {
    const user = userEvent.setup();
    let created: Record<string, unknown> | null = null;
    server.use(
      ...posHandlers({ registers: [] }),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/registers", async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(registerRecord, { status: 201 });
      }),
    );

    renderWithRouter(<PosWorkspace />);

    await user.type(await screen.findByLabelText(/register name/i), "Counter 1");
    await user.click(screen.getByRole("button", { name: /create register/i }));

    await waitFor(() => {
      expect(created).toMatchObject({ name: "Counter 1", locationId: LOCATION_ID });
    });
  });

  it("links the completed sale to the sale history entry", async () => {
    const user = userEvent.setup();
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(completedSale, { status: 201 }),
      ),
    );

    renderWithRouter(<PosWorkspace />);

    await openTheShift(user);
    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    await screen.findByText(/receipt rcp-000001/i);
    await user.click(screen.getByRole("button", { name: /view sale history/i }));

    const history = await screen.findByRole("table", { name: /sale history/i });
    expect(
      within(history).getByRole("cell", { name: "Completed" }),
    ).toBeInTheDocument();
  });
});

describe("counter-sale workspace extensions", () => {
  it("asks the cashier to create a location before selling", async () => {
    server.use(http.get("*/api/v1/locations", () => HttpResponse.json([])));
    renderWithRouter(<PosWorkspace />);
    expect(await screen.findByText(/before you can sell/i)).toBeInTheDocument();
  });

  it("hydrates the till from InventoryX open shifts after refresh", async () => {
    server.use(
      ...posHandlers({ openShifts: [shiftRecord] }),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    renderWithRouter(<PosWorkspace />);

    expect(
      await screen.findByRole("button", { name: /take cash payment/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open shift/i })).toBeNull();
  });

  it("lets the cashier pick among multiple open shifts", async () => {
    const user = userEvent.setup();
    const secondRegister = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      locationId: LOCATION_ID,
      name: "Counter 2",
      isActive: true,
    };
    const secondShift = {
      ...shiftRecord,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      registerId: secondRegister.id,
      openedBy: "cashier@kwame.gh",
      openingFloat: 50,
    };
    server.use(
      ...posHandlers({
        registers: [registerRecord, secondRegister],
        openShifts: [shiftRecord, secondShift],
      }),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    renderWithRouter(<PosWorkspace />);

    expect(
      await screen.findByRole("button", { name: /resume shift on counter 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resume shift on counter 2/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /resume shift on counter 2/i }),
    );

    expect(
      await screen.findByRole("button", { name: /take cash payment/i }),
    ).toBeInTheDocument();
  });

  it("offers resume when opening a shift conflicts with an existing open shift", async () => {
    const user = userEvent.setup();
    server.use(...posHandlers());
    // Registered after so these win over posHandlers' open-shift POST.
    server.use(
      http.post("*/api/v1/registers/:registerId/shifts", () =>
        HttpResponse.json(
          {
            title: "Register already has an open shift.",
            status: 409,
            type: "https://httpstatuses.com/409",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
      http.get("*/api/v1/registers/:registerId/shifts", ({ request }) => {
        expect(new URL(request.url).searchParams.get("status")).toBe("Open");
        return HttpResponse.json([shiftRecord]);
      }),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);

    await user.click(
      await screen.findByRole("button", { name: /resume existing shift/i }),
    );

    expect(
      await screen.findByRole("button", { name: /take cash payment/i }),
    ).toBeInTheDocument();
  });

  it("scans a known barcode, holds the cart, then opens returns", async () => {
    const user = userEvent.setup();
    let held = false;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get("*/api/v1/products/barcode/:barcode", ({ params }) => {
        if (params["barcode"] === "6001234567890") {
          return HttpResponse.json({
            ...pagedProducts.items[0],
            barcode: "6001234567890",
          });
        }
        return HttpResponse.json(
          { title: "No product matches this barcode.", status: 404 },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        );
      }),
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as { status?: string };
        if (body.status === "Held") {
          held = true;
          return HttpResponse.json(
            { ...completedSale, status: "Held", payments: [] },
            { status: 201 },
          );
        }
        return HttpResponse.json(completedSale, { status: 201 });
      }),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([us2.heldSale])),
      http.get(`*/api/v1/sales/held/${us2.HELD_SALE_ID}`, () =>
        HttpResponse.json(us2.heldSale),
      ),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);

    for (const key of "6001234567890") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(await screen.findByLabelText(/quantity for sugar 1kg/i)).toBeVisible();
    await user.clear(screen.getByLabelText(/discount.*sugar 1kg/i));
    await user.type(screen.getByLabelText(/discount.*sugar 1kg/i), "1.00");
    await user.type(screen.getByLabelText(/note for sugar 1kg/i), "Opened");
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/cash received/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    await user.click(screen.getByRole("button", { name: /hold this sale/i }));
    await waitFor(() => {
      expect(held).toBe(true);
    });
    expect(screen.queryByLabelText(/quantity for sugar 1kg/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /recall held sale/i }));
    expect(await screen.findByLabelText(/quantity for sugar 1kg/i)).toBeVisible();

    await user.click(screen.getByRole("tab", { name: /returns/i }));
    expect(screen.getByLabelText(/receipt number/i)).toBeVisible();
  });

  it("completes a recalled held sale with cash and loads its receipt", async () => {
    const user = userEvent.setup();
    let completed = false;
    let created = false;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([us2.heldSale])),
      http.get(`*/api/v1/sales/held/${us2.HELD_SALE_ID}`, () =>
        HttpResponse.json(us2.heldSale),
      ),
      http.post("*/api/v1/sales", () => {
        created = true;
        return HttpResponse.json(us2.heldSale, { status: 201 });
      }),
      http.post(`*/api/v1/sales/${us2.HELD_SALE_ID}/complete`, async ({ request }) => {
        const body = (await request.json()) as {
          payments: Array<{ tender: string; amount: number }>;
        };
        expect(body.payments).toEqual([
          { tender: "Cash", amount: 11.5, reference: null },
        ]);
        completed = true;
        return HttpResponse.json({
          ...us2.heldSale,
          status: "Completed",
          payments: body.payments,
        });
      }),
      http.get(`*/api/v1/sales/${us2.HELD_SALE_ID}/receipt`, () =>
        HttpResponse.json({ ...receiptRecord, saleId: us2.HELD_SALE_ID }),
      ),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await user.click(await screen.findByRole("button", { name: /recall held sale/i }));
    await screen.findByLabelText(/quantity for sugar 1kg/i);
    await user.type(screen.getByLabelText(/cash received/i), "10.00");
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    expect(screen.getByLabelText(/cash received/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(completed).toBe(false);
    await user.clear(screen.getByLabelText(/cash received/i));
    await user.type(screen.getByLabelText(/cash received/i), "11.50");
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByText(/receipt rcp-000001/i)).toBeInTheDocument();
    expect(completed).toBe(true);
    expect(created).toBe(false);
  });

  it("sends an edited held sale discount for server recalculation", async () => {
    const user = userEvent.setup();
    let editedDiscount: number | undefined;
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([us2.heldSale])),
      http.get(`*/api/v1/sales/held/${us2.HELD_SALE_ID}`, () =>
        HttpResponse.json(us2.heldSale),
      ),
      http.post(`*/api/v1/sales/${us2.HELD_SALE_ID}/complete`, async ({ request }) => {
        const body = (await request.json()) as {
          lines: Array<{ id: string; qty: number; lineDiscount: number }>;
          payments: Array<{ amount: number }>;
        };
        expect(body.lines).toEqual([
          expect.objectContaining({
            id: us2.heldSale.lines[0]?.id,
            qty: 1,
            lineDiscount: 5,
          }),
        ]);
        editedDiscount = body.lines[0]?.lineDiscount;
        expect(body.payments[0]?.amount).toBe(10);
        return HttpResponse.json({
          ...us2.heldSale,
          status: "Completed",
          discountTotal: 5,
          taxTotal: 0.75,
          grandTotal: 5.75,
          lines: [
            {
              ...us2.heldSale.lines[0],
              lineDiscount: 5,
              taxAmount: 0.75,
              lineTotal: 5.75,
            },
          ],
          payments: [{ tender: "Cash", amount: 10, reference: null }],
        });
      }),
      http.get(`*/api/v1/sales/${us2.HELD_SALE_ID}/receipt`, () =>
        HttpResponse.json({ ...receiptRecord, saleId: us2.HELD_SALE_ID }),
      ),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await user.click(await screen.findByRole("button", { name: /recall held sale/i }));
    const discount = await screen.findByLabelText(/discount.*sugar 1kg/i);
    await user.clear(discount);
    await user.type(discount, "50");
    await user.type(screen.getByLabelText(/cash received/i), "10");
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));

    expect(await screen.findByText(/receipt rcp-000001/i)).toBeInTheDocument();
    expect(editedDiscount).toBe(5);
  });

  it("shows the unknown-barcode panel when the scan is not in the catalogue", async () => {
    const user = userEvent.setup();
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get("*/api/v1/products/barcode/:barcode", () =>
        HttpResponse.json(
          { title: "No product matches this barcode.", status: 404 },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);

    for (const key of "0000000000000") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(await screen.findByText(/no product matches this barcode/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(
      screen.queryByText(/no product matches this barcode/i),
    ).not.toBeInTheDocument();
  });

  it("removes a cart line and returns from history to a new sale", async () => {
    const user = userEvent.setup();
    server.use(
      ...posHandlers(),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(completedSale, { status: 201 }),
      ),
    );

    renderWithRouter(<PosWorkspace />);
    await openTheShift(user);
    await user.click(await screen.findByRole("button", { name: /add sugar 1kg/i }));
    await user.click(screen.getByRole("button", { name: /remove sugar 1kg/i }));
    expect(screen.queryByLabelText(/quantity for sugar 1kg/i)).not.toBeInTheDocument();

    await ringUpTwoUnits(user);
    await user.click(screen.getByRole("button", { name: /take cash payment/i }));
    await screen.findByText(/receipt rcp-000001/i);
    await user.click(screen.getByRole("button", { name: /view sale history/i }));
    await user.click(screen.getByRole("button", { name: /back to the till/i }));
    expect(await screen.findByText(/receipt rcp-000001/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /new sale/i }));
    expect(
      await screen.findByRole("button", { name: /add sugar 1kg/i }),
    ).toBeInTheDocument();
  });
});
