import { beforeEach, describe, expect, it } from "vitest";
import {
  clearOpenShiftHint,
  listOpenShiftHints,
  resetOpenShiftHintsForTests,
  setOpenShiftHint,
} from "./open-shift-resume-store";

const TENANT = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

describe("openShiftResumeStore", () => {
  beforeEach(() => {
    resetOpenShiftHintsForTests();
  });

  it("upserts by register and lists only the requested tenant", () => {
    setOpenShiftHint({
      tenantId: TENANT,
      registerId: "reg-1",
      registerName: "Front",
      shiftId: "shift-1",
    });
    setOpenShiftHint({
      tenantId: TENANT,
      registerId: "reg-1",
      registerName: "Front",
      shiftId: "shift-2",
    });
    setOpenShiftHint({
      tenantId: OTHER,
      registerId: "reg-9",
      registerName: "Other",
      shiftId: "shift-9",
    });

    expect(listOpenShiftHints(TENANT)).toEqual([
      {
        tenantId: TENANT,
        registerId: "reg-1",
        registerName: "Front",
        shiftId: "shift-2",
      },
    ]);
  });

  it("clears a hint by shift id", () => {
    setOpenShiftHint({
      tenantId: TENANT,
      registerId: "reg-1",
      registerName: "Front",
      shiftId: "shift-1",
    });
    clearOpenShiftHint(TENANT, "shift-1");
    expect(listOpenShiftHints(TENANT)).toEqual([]);
  });
});
