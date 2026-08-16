import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineProvisionalReceipt } from "./offline-receipt";

describe("offline provisional receipt", () => {
  it("labels pending sync and separates final identity", () => {
    render(
      <OfflineProvisionalReceipt
        clientSaleId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        registerId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        occurredAt="2026-08-13T12:00:00.000Z"
        lines={[{ name: "Sugar", qty: "1", lineTotal: "10.00" }]}
        grandTotal="10.00"
        qrPayload={JSON.stringify({
          type: "provisional",
          clientSaleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        })}
        finalReceiptNumber="R-100"
      />,
    );
    expect(screen.getByText(/Pending sync/i)).toBeInTheDocument();
    expect(screen.getByText(/not the final fiscal/i)).toBeInTheDocument();
    expect(screen.getByText(/Final receipt R-100/i)).toBeInTheDocument();
  });
});
