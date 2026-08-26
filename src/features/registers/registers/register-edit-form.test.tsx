import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../../../shared/test/render";
import { server } from "../../../shared/test/msw/server";
import { registerRecord } from "../../../../tests/fixtures/provider/us1";
import { RegisterEditForm } from "./register-edit-form";

describe("RegisterEditForm", () => {
  it("patches till name and reports success", async () => {
    const user = userEvent.setup();
    let seenBody: unknown;
    let seenIfMatch: string | null = null;
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, async ({ request }) => {
        seenBody = await request.json();
        seenIfMatch = request.headers.get("If-Match");
        return HttpResponse.json({
          ...registerRecord,
          name: "Front counter",
        });
      }),
    );
    const onUpdated = vi.fn();
    renderWithProviders(
      <RegisterEditForm
        register={{ ...registerRecord, etag: '"reg-1"' }}
        onUpdated={onUpdated}
      />,
    );

    const name = screen.getByLabelText(/till name/i);
    await user.clear(name);
    await user.type(name, "Front counter");
    await user.click(screen.getByRole("button", { name: /save till/i }));

    await waitFor(() => {
      expect(seenBody).toEqual({ name: "Front counter", isActive: null });
    });
    expect(seenIfMatch).toBe('"reg-1"');
    expect(await screen.findByRole("status")).toHaveTextContent(/till updated/i);
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Front counter" }),
    );
  });

  it("omits If-Match when the register has no per-resource etag", async () => {
    const user = userEvent.setup();
    let seenIfMatch: string | null | undefined = undefined;
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, ({ request }) => {
        seenIfMatch = request.headers.get("If-Match");
        return HttpResponse.json({
          ...registerRecord,
          name: "No etag till",
        });
      }),
    );
    renderWithProviders(<RegisterEditForm register={{ ...registerRecord }} />);

    const name = screen.getByLabelText(/till name/i);
    await user.clear(name);
    await user.type(name, "No etag till");
    await user.click(screen.getByRole("button", { name: /save till/i }));

    await waitFor(() => {
      expect(seenIfMatch).toBeNull();
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/till updated/i);
  });

  it("surfaces 409 stale conflicts", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, () =>
        HttpResponse.json(
          {
            title: "Conflict",
            status: 409,
            detail: "Register was updated elsewhere.",
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(
      <RegisterEditForm register={{ ...registerRecord, etag: '"stale"' }} />,
    );

    const name = screen.getByLabelText(/till name/i);
    await user.clear(name);
    await user.type(name, "Stale name");
    await user.click(screen.getByRole("button", { name: /save till/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/conflict/i);
    expect(alert).toHaveTextContent(/updated elsewhere/i);
  });

  it("deactivates a till after confirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    let seenBody: unknown;
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({
          ...registerRecord,
          isActive: false,
        });
      }),
    );
    renderWithProviders(
      <RegisterEditForm register={{ ...registerRecord, etag: '"reg-1"' }} />,
    );

    await user.click(screen.getByRole("checkbox", { name: /active till/i }));
    await user.click(screen.getByRole("button", { name: /save till/i }));

    await waitFor(() => {
      expect(seenBody).toEqual({ name: null, isActive: false });
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(/till updated/i);
    confirmSpy.mockRestore();
  });
});
