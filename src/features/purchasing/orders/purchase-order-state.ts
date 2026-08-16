/** Mirrors InventoryX PurchaseOrderStatus transitions used by the UI. */
export const PO_TRANSITIONS = {
  Draft: ["AwaitingApproval", "Sent", "Cancelled"],
  AwaitingApproval: ["Sent", "Cancelled"],
  Sent: ["PartiallyReceived", "FullyReceived", "Closed", "Cancelled"],
  PartiallyReceived: ["FullyReceived", "Closed"],
  FullyReceived: [],
  Closed: [],
  Cancelled: [],
} as const;

export type PoStatus = keyof typeof PO_TRANSITIONS;

export function canTransition(from: string, to: string): boolean {
  if (!Object.hasOwn(PO_TRANSITIONS, from)) return false;
  const allowed = PO_TRANSITIONS[from as PoStatus];
  return (allowed as readonly string[]).includes(to);
}

export function requiresCloseShortReason(status: string): boolean {
  return status === "Sent" || status === "PartiallyReceived";
}

export function requiresApprovalThreshold(total: number, threshold = 5000): boolean {
  return total > threshold;
}

/** InventoryX rejects stale PO edits without If-Match when an ETag is known. */
export function purchaseOrderIfMatchHeaders(etag: string | undefined): HeadersInit {
  return etag ? { "If-Match": etag } : {};
}

export function nextActionLabel(status: string): string | null {
  switch (status) {
    case "Draft":
      return "Submit";
    case "AwaitingApproval":
      return "Approve";
    case "Sent":
    case "PartiallyReceived":
      return "Receive goods";
    default:
      return null;
  }
}
