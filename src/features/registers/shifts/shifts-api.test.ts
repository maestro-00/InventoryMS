import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ProblemError } from "../../../shared/api/errors/problem-error";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import { shiftRecord } from "../../../../tests/fixtures/provider/us1";
import { closeShift, fetchZReport, recordCashMovement } from "./shifts-api";

describe("shifts-api", () => {
  it("closes a shift with counted cash", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post(`*/api/v1/shifts/${shiftRecord.id}/close`, async ({ request }) => {
        const body = (await request.json()) as { closingCounted: number };
        expect(body.closingCounted).toBe(250);
        return HttpResponse.json({ ...shiftRecord, status: "Closed" });
      }),
    );

    const result = await closeShift({
      shiftId: shiftRecord.id,
      closingCounted: "250",
    });

    expect(result.status).toBe("Closed");
  });

  it("maps cash movement direction to wire type", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post(
        `*/api/v1/shifts/${shiftRecord.id}/cash-movements`,
        async ({ request }) => {
          const body = (await request.json()) as {
            type: string;
            amount: number;
            reason: string;
          };
          expect(body).toEqual({
            type: "CashIn",
            amount: 50,
            reason: "PettyCash: float top-up",
          });
          return HttpResponse.json({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            type: "CashIn",
            reason: "PettyCash: float top-up",
            amount: 50,
          });
        },
      ),
    );

    const movement = await recordCashMovement({
      shiftId: shiftRecord.id,
      direction: "CashIn",
      reason: "PettyCash",
      amount: "50",
      note: "float top-up",
    });

    expect(movement.type).toBe("CashIn");
    expect(movement.amount).toBe("50");
  });

  it("surfaces close-shift problems as ProblemError", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post(`*/api/v1/shifts/${shiftRecord.id}/close`, () =>
        HttpResponse.json(
          { title: "Conflict", status: 409, detail: "Shift already closed" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      closeShift({ shiftId: shiftRecord.id, closingCounted: "0" }),
    ).rejects.toBeInstanceOf(ProblemError);
  });

  it("loads a Z report", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get(`*/api/v1/shifts/${shiftRecord.id}/z-report`, () =>
        HttpResponse.json({
          shiftId: shiftRecord.id,
          salesTotal: 100,
          expectedCash: 100,
          countedCash: 100,
          variance: 0,
          tenders: [{ tender: "Cash", amount: 100 }],
        }),
      ),
    );

    const report = await fetchZReport(shiftRecord.id);
    expect(report.salesTotal).toBe("100");
  });
});
