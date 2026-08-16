import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { ownerSessionRecord } from "../../../shared/test/render";
import { renderWithRouter } from "../../../shared/test/render-router";
import { BusinessSettings } from "./business-settings";
import { tenantProfile } from "../../../../tests/fixtures/provider/us1";

function tenantHandlers() {
  return [
    http.get("*/api/v1/tenant", () =>
      HttpResponse.json(tenantProfile, { headers: { ETag: 'W/"tenant-1"' } }),
    ),
  ];
}

describe("business settings", () => {
  it("shows the saved business profile", async () => {
    server.use(...tenantHandlers());

    renderWithRouter(<BusinessSettings />);

    expect(await screen.findByLabelText(/business name/i)).toHaveValue(
      "Kwame Provisions",
    );
    expect(screen.getByLabelText(/business address/i)).toHaveValue(
      "12 Oxford Street, Accra",
    );
    expect(screen.getByLabelText(/billing email/i)).toHaveValue("owner@kwame.gh");
  });

  it("saves the profile with the If-Match header from the loaded tenant", async () => {
    const user = userEvent.setup();
    let ifMatch: string | null = null;
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...tenantHandlers(),
      http.patch("*/api/v1/tenant", async ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(tenantProfile);
      }),
    );

    renderWithRouter(<BusinessSettings />);

    const phone = await screen.findByLabelText(/phone/i);
    await user.clear(phone);
    await user.type(phone, "+233209999999");
    await user.click(screen.getByRole("button", { name: /save business profile/i }));

    await waitFor(() => {
      expect(sent).toMatchObject({ phone: "+233209999999" });
    });
    expect(ifMatch).toBe('W/"tenant-1"');
  });

  it("requires an explicit confirmation before changing the valuation method", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...tenantHandlers(),
      http.patch("*/api/v1/tenant", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...tenantProfile, valuationMethod: "FIFO" });
      }),
    );

    renderWithRouter(<BusinessSettings />);

    await user.selectOptions(await screen.findByLabelText(/valuation method/i), "FIFO");
    await user.click(screen.getByRole("button", { name: /save valuation method/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /confirm the valuation change/i,
    );
    expect(sent).toBeNull();

    await user.click(
      screen.getByRole("checkbox", { name: /i understand this changes how stock/i }),
    );
    await user.click(screen.getByRole("button", { name: /save valuation method/i }));

    await waitFor(() => {
      expect(sent).toMatchObject({
        valuationMethod: "FIFO",
        confirmValuationChange: true,
      });
    });
  });

  it("saves approval thresholds as decimal strings", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...tenantHandlers(),
      http.patch("*/api/v1/tenant", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(tenantProfile);
      }),
    );

    renderWithRouter(<BusinessSettings />);

    const threshold = await screen.findByLabelText(/stock adjustment approval/i);
    await user.clear(threshold);
    await user.type(threshold, "300.50");
    await user.click(screen.getByRole("button", { name: /save approval thresholds/i }));

    await waitFor(() => {
      expect(sent).toMatchObject({ adjustmentApprovalThreshold: "300.50" });
    });
  });

  it("rejects a non-decimal threshold before contacting the provider", async () => {
    const user = userEvent.setup();
    server.use(...tenantHandlers());

    renderWithRouter(<BusinessSettings />);

    const threshold = await screen.findByLabelText(/stock adjustment approval/i);
    await user.clear(threshold);
    await user.type(threshold, "lots");
    await user.click(screen.getByRole("button", { name: /save approval thresholds/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/decimal/i);
  });

  it("denies access to a role without tenant settings rights", async () => {
    server.use(...tenantHandlers());

    renderWithRouter(<BusinessSettings />, {
      session: { ...ownerSessionRecord, role: "Cashier", permissions: ["Sell"] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /do not have access to this page/i,
    );
  });
});
