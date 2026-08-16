import { describe, expect, it } from "vitest";
import {
  canTransition,
  nextActionLabel,
  purchaseOrderIfMatchHeaders,
  requiresApprovalThreshold,
  requiresCloseShortReason,
} from "./purchase-order-state";

describe("purchase order state", () => {
  it("allows draft submit into awaiting approval or sent", () => {
    expect(canTransition("Draft", "AwaitingApproval")).toBe(true);
    expect(canTransition("Draft", "Sent")).toBe(true);
    expect(canTransition("Draft", "FullyReceived")).toBe(false);
  });

  it("routes high-value drafts through approval before send", () => {
    expect(requiresApprovalThreshold(5000)).toBe(false);
    expect(requiresApprovalThreshold(5000.01)).toBe(true);
    expect(canTransition("AwaitingApproval", "Sent")).toBe(true);
  });

  it("requires a reason to close short from open receive states", () => {
    expect(requiresCloseShortReason("Sent")).toBe(true);
    expect(requiresCloseShortReason("PartiallyReceived")).toBe(true);
    expect(requiresCloseShortReason("Draft")).toBe(false);
  });

  it("attaches If-Match only when an ETag is present", () => {
    expect(purchaseOrderIfMatchHeaders(undefined)).toEqual({});
    expect(purchaseOrderIfMatchHeaders('"po-v3"')).toEqual({ "If-Match": '"po-v3"' });
  });

  it("exposes the next cashier/manager action label", () => {
    expect(nextActionLabel("Draft")).toBe("Submit");
    expect(nextActionLabel("AwaitingApproval")).toBe("Approve");
    expect(nextActionLabel("Sent")).toBe("Receive goods");
    expect(nextActionLabel("PartiallyReceived")).toBe("Receive goods");
    expect(nextActionLabel("FullyReceived")).toBeNull();
  });

  it("rejects unknown source statuses", () => {
    expect(canTransition("NotAStatus", "Sent")).toBe(false);
  });
});
