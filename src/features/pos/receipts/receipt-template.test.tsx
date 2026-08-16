import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { ownerSessionRecord } from "../../../shared/test/render";
import { renderWithRouter } from "../../../shared/test/render-router";
import { ReceiptTemplateSettings } from "./receipt-template";
import { receiptTemplate } from "../../../../tests/fixtures/provider/us1";

function templateHandlers() {
  return [
    http.get("*/api/v1/tenant/receipt-template", () =>
      HttpResponse.json(receiptTemplate, { headers: { ETag: 'W/"template-1"' } }),
    ),
  ];
}

describe("receipt template settings", () => {
  it("loads the saved logo, business, tax, footer, and return policy values", async () => {
    server.use(...templateHandlers());

    renderWithRouter(<ReceiptTemplateSettings />);

    expect(await screen.findByLabelText(/business name/i)).toHaveValue(
      "Kwame Provisions",
    );
    expect(screen.getByLabelText(/logo url/i)).toHaveValue(
      "https://cdn.kwame.gh/logo.png",
    );
    expect(screen.getByLabelText(/tax identifier/i)).toHaveValue("GHA-123456789");
    expect(screen.getByLabelText(/footer/i)).toHaveValue(
      "Thank you for shopping with us",
    );
    expect(screen.getByLabelText(/return policy/i)).toHaveValue(
      "Returns accepted within 7 days with a receipt.",
    );
  });

  it("previews the receipt as the customer will see it", async () => {
    const user = userEvent.setup();
    server.use(...templateHandlers());

    renderWithRouter(<ReceiptTemplateSettings />);

    const footer = await screen.findByLabelText(/footer/i);
    await user.clear(footer);
    await user.type(footer, "Ask for your receipt");

    const preview = screen.getByRole("region", { name: /receipt preview/i });
    expect(preview).toHaveTextContent("Ask for your receipt");
    expect(preview).toHaveTextContent("GHA-123456789");
  });

  it("saves with the If-Match header from the loaded template", async () => {
    const user = userEvent.setup();
    let ifMatch: string | null = null;
    server.use(
      ...templateHandlers(),
      http.put("*/api/v1/tenant/receipt-template", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return HttpResponse.json(receiptTemplate);
      }),
    );

    renderWithRouter(<ReceiptTemplateSettings />);

    await screen.findByLabelText(/business name/i);
    await user.click(screen.getByRole("button", { name: /save receipt template/i }));

    await waitFor(() => {
      expect(ifMatch).toBe('W/"template-1"');
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      /receipt template saved/i,
    );
  });

  it("blocks a save without a business name", async () => {
    const user = userEvent.setup();
    server.use(
      ...templateHandlers(),
      http.put("*/api/v1/tenant/receipt-template", () =>
        HttpResponse.json(receiptTemplate),
      ),
    );

    renderWithRouter(<ReceiptTemplateSettings />);

    await user.clear(await screen.findByLabelText(/business name/i));
    await user.click(screen.getByRole("button", { name: /save receipt template/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /business name shown on receipts/i,
    );
  });

  it("keeps the draft and explains a stale conflict", async () => {
    const user = userEvent.setup();
    server.use(
      ...templateHandlers(),
      http.put("*/api/v1/tenant/receipt-template", () =>
        HttpResponse.json(
          {
            title: "The receipt template changed on the server",
            status: 409,
            detail: "Reload the template and apply your change again.",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithRouter(<ReceiptTemplateSettings />);

    const footer = await screen.findByLabelText(/footer/i);
    await user.clear(footer);
    await user.type(footer, "Ask for your receipt");
    await user.click(screen.getByRole("button", { name: /save receipt template/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /changed on the server/i,
    );
    expect(screen.getByLabelText(/footer/i)).toHaveValue("Ask for your receipt");
  });

  it("shows a read-only view for a role without tenant settings access", async () => {
    server.use(...templateHandlers());

    renderWithRouter(<ReceiptTemplateSettings />, {
      session: { ...ownerSessionRecord, role: "Cashier", permissions: ["Sell"] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /do not have access to this page/i,
    );
    expect(
      screen.queryByRole("button", { name: /save receipt template/i }),
    ).not.toBeInTheDocument();
  });
});
