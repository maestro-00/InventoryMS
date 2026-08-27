import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { sessionManager } from "../../../shared/auth/session-manager";
import { server } from "../../../shared/test/msw/server";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import {
  LOCATION_ID,
  registerRecord,
  shiftRecord,
} from "../../../../tests/fixtures/provider/us1";
import { useOpenShifts } from "./use-open-shifts";

describe("useOpenShifts", () => {
  it("filters out shifts whose register belongs to another location", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    const otherLocationRegister = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      locationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Warehouse till",
      isActive: true,
    };
    const otherShift = {
      ...shiftRecord,
      registerId: otherLocationRegister.id,
    };
    const localShift = {
      ...shiftRecord,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      registerId: registerRecord.id,
    };
    server.use(
      http.get("*/api/v1/shifts", ({ request }) => {
        expect(new URL(request.url).searchParams.get("status")).toBe("Open");
        return HttpResponse.json([otherShift, localShift]);
      }),
      http.get("*/api/v1/registers", () =>
        HttpResponse.json([registerRecord, otherLocationRegister]),
      ),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useOpenShifts({ locationId: LOCATION_ID }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });
    expect(result.current.entries[0]?.registerName).toBe(registerRecord.name);
    expect(result.current.entries[0]?.shift.registerId).toBe(registerRecord.id);
  });
});
