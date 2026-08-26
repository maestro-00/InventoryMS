import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../../../shared/test/render";
import { server } from "../../../shared/test/msw/server";
import { REGISTER_ID, SHIFT_ID } from "../../../../tests/fixtures/provider/us1";
import {
  getRegisterAccessToken,
  isRegisterUnlockedForShift,
  lockRegisterAuth,
  unlockRegister,
} from "../../../shared/auth/register-auth-store";
import { ProblemError } from "../../../shared/api/errors/problem-error";
import { prepareRegister } from "../../offline-sync/prepare-register";
import { RegisterPinUnlock } from "./register-pin-unlock";

vi.mock("../../offline-sync/prepare-register", () => ({
  prepareRegister: vi.fn(() =>
    Promise.resolve({
      deadline: "2099-01-01T00:00:00.000Z",
      productCount: 0,
    }),
  ),
}));

const prepareRegisterMock = vi.mocked(prepareRegister);

function registerAccessToken(exp: number): string {
  const claims = { exp };
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
}

const TENANT_ID = "22222222-2222-4222-8222-222222222222";

describe("RegisterPinUnlock", () => {
  beforeEach(async () => {
    await lockRegisterAuth({ persistPartition: false });
    prepareRegisterMock.mockReset();
    prepareRegisterMock.mockResolvedValue({
      deadline: "2099-01-01T00:00:00.000Z",
      productCount: 0,
    });
  });

  it("requires an open shift before unlock", () => {
    renderWithProviders(<RegisterPinUnlock registerId={REGISTER_ID} />);
    expect(
      screen.getByText(/open a shift on this till before unlocking/i),
    ).toBeInTheDocument();
  });

  it("prepares then unlocks till and binds session.registerId", async () => {
    const user = userEvent.setup();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const callOrder: string[] = [];
    prepareRegisterMock.mockImplementation(() => {
      callOrder.push("prepare");
      expect(isRegisterUnlockedForShift(TENANT_ID, REGISTER_ID, SHIFT_ID)).toBe(false);
      return Promise.resolve({ deadline: "2099-01-01T00:00:00.000Z", productCount: 0 });
    });
    server.use(
      http.post("*/api/v1/auth/pin/exchange", async ({ request }) => {
        callOrder.push("exchange");
        const body = (await request.json()) as { pin?: string; registerId?: string };
        expect(body.pin).toBe("4242");
        expect(body.registerId).toBe(REGISTER_ID);
        return HttpResponse.json({
          accessToken: registerAccessToken(exp),
          tokenType: "Bearer",
        });
      }),
    );

    const { manager } = renderWithProviders(
      <RegisterPinUnlock registerId={REGISTER_ID} shiftId={SHIFT_ID} />,
    );

    await user.type(screen.getByLabelText(/register pin/i), "4242");
    await user.click(screen.getByRole("button", { name: /unlock till/i }));

    await waitFor(() => {
      expect(isRegisterUnlockedForShift(TENANT_ID, REGISTER_ID, SHIFT_ID)).toBe(true);
    });
    expect(callOrder).toEqual(["exchange", "prepare"]);
    expect(manager.getSnapshot()?.registerId).toBe(REGISTER_ID);
    await expect(getRegisterAccessToken()).resolves.toContain("header.");
    expect(await screen.findByRole("status")).toHaveTextContent(/register unlocked/i);
  });

  it("leaves the till locked when prepare fails", async () => {
    const user = userEvent.setup();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    prepareRegisterMock.mockRejectedValue(
      new ProblemError({
        kind: "transient",
        status: 503,
        title: "Snapshot unavailable",
        detail: "Register snapshot could not be prepared.",
        fieldErrors: {},
        extensions: {},
      }),
    );
    server.use(
      http.post("*/api/v1/auth/pin/exchange", () =>
        HttpResponse.json({
          accessToken: registerAccessToken(exp),
          tokenType: "Bearer",
        }),
      ),
    );

    const { manager } = renderWithProviders(
      <RegisterPinUnlock registerId={REGISTER_ID} shiftId={SHIFT_ID} />,
    );

    await user.type(screen.getByLabelText(/register pin/i), "4242");
    await user.click(screen.getByRole("button", { name: /unlock till/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/snapshot unavailable/i);
    expect(alert).toHaveTextContent(/could not be prepared/i);
    expect(isRegisterUnlockedForShift(TENANT_ID, REGISTER_ID, SHIFT_ID)).toBe(false);
    expect(manager.getSnapshot()?.registerId).not.toBe(REGISTER_ID);
    await expect(getRegisterAccessToken()).resolves.toBeNull();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not lock an already-unlocked till when prepare fails for another till", async () => {
    const otherRegisterId = "a8888888-8888-4888-8888-888888888888";
    const otherShiftId = "a9999999-9999-4999-8999-999999999999";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    await unlockRegister({
      tenantId: TENANT_ID,
      registerId: otherRegisterId,
      shiftId: otherShiftId,
      accessToken: registerAccessToken(exp),
      expiresAt: new Date(exp * 1000).toISOString(),
    });
    expect(isRegisterUnlockedForShift(TENANT_ID, otherRegisterId, otherShiftId)).toBe(
      true,
    );

    const user = userEvent.setup();
    prepareRegisterMock.mockRejectedValue(
      new ProblemError({
        kind: "transient",
        status: 503,
        title: "Snapshot unavailable",
        detail: "Register snapshot could not be prepared.",
        fieldErrors: {},
        extensions: {},
      }),
    );
    server.use(
      http.post("*/api/v1/auth/pin/exchange", () =>
        HttpResponse.json({
          accessToken: registerAccessToken(exp),
          tokenType: "Bearer",
        }),
      ),
    );

    renderWithProviders(
      <RegisterPinUnlock registerId={REGISTER_ID} shiftId={SHIFT_ID} />,
    );

    await user.type(screen.getByLabelText(/register pin/i), "4242");
    await user.click(screen.getByRole("button", { name: /unlock till/i }));

    await screen.findByRole("alert");
    expect(isRegisterUnlockedForShift(TENANT_ID, otherRegisterId, otherShiftId)).toBe(
      true,
    );
    expect(isRegisterUnlockedForShift(TENANT_ID, REGISTER_ID, SHIFT_ID)).toBe(false);
    await expect(getRegisterAccessToken()).resolves.toContain("header.");
  });
});
