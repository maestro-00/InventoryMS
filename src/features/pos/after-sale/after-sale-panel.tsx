import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import type { ProductRecord } from "../../catalogue/products/api/products-api";
import type { SaleRecord } from "../sales/api/sales-api";
import {
  createExchange,
  createReturn,
  lookupSales,
  voidSale,
} from "./api/after-sale-api";
import { eligibleReturnQty } from "./eligible-return";

export function AfterSalePanel({
  registerId,
  shiftId,
  products,
  initialSale,
  compact = false,
}: {
  registerId: string;
  shiftId: string;
  products: ProductRecord[];
  initialSale?: SaleRecord | null;
  compact?: boolean;
}) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [sale, setSale] = useState<SaleRecord | null>(initialSale ?? null);
  const [qty, setQty] = useState("1");
  const [disposition, setDisposition] = useState<"ToStock" | "Quarantine">("ToStock");
  const [reason, setReason] = useState("");
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<unknown>(null);

  useEffect(() => {
    if (initialSale) setSale(initialSale);
  }, [initialSale]);

  const lookup = useMutation({
    mutationFn: () => lookupSales({ receiptNumber }),
    onSuccess: (matches) => {
      setSale(matches[0] ?? null);
      setLookupError(null);
    },
    onError: (error) => {
      setLookupError(error);
    },
  });

  const returning = useMutation({
    mutationFn: () => {
      const line = sale?.lines[0];
      if (!sale || !line) throw new Error("Look up a sale first");
      return createReturn({
        originalSaleId: sale.id,
        refundTender: "Original",
        lines: [{ saleLineId: line.id, qty, disposition }],
      });
    },
  });

  const exchanging = useMutation({
    mutationFn: () => {
      const line = sale?.lines[0];
      if (!sale || !line || !replacementId) throw new Error("Choose a replacement");
      return createExchange({
        originalSaleId: sale.id,
        registerId,
        shiftId,
        refundTender: "Original",
        lines: [{ saleLineId: line.id, qty, disposition }],
        newLines: [{ productId: replacementId, qty: "1" }],
        payments: [],
      });
    },
  });

  const voiding = useMutation({
    mutationFn: () => {
      if (!sale) throw new Error("Look up a sale first");
      return voidSale(sale.id, reason);
    },
  });

  const line = sale?.lines[0];

  return (
    <section className="flex flex-col gap-4" aria-label="Returns and exchanges">
      {!compact ? (
        <>
          <TextField
            label="Receipt number"
            value={receiptNumber}
            onChange={(event) => {
              setReceiptNumber(event.target.value);
            }}
          />
          <Button
            type="button"
            onClick={() => {
              lookup.mutate();
            }}
          >
            Find sale
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Return or void this sale without leaving the receipt.
        </p>
      )}
      {toProblem(lookupError) ? (
        <ProblemSummary problem={toProblem(lookupError)} />
      ) : null}

      {sale && line ? (
        <div className="flex flex-col gap-3">
          <p>
            {line.productName} · eligible {eligibleReturnQty(line)}
          </p>
          <TextField
            label={`Return quantity for ${line.productName}`}
            inputMode="decimal"
            value={qty}
            onChange={(event) => {
              setQty(event.target.value);
            }}
          />
          <SelectField
            label={`Disposition for ${line.productName}`}
            value={disposition}
            options={[
              { value: "ToStock", label: "ToStock" },
              { value: "Quarantine", label: "Quarantine" },
            ]}
            onChange={(event) => {
              setDisposition(event.target.value as "ToStock" | "Quarantine");
            }}
          />
          <Button
            type="button"
            onClick={() => {
              returning.mutate();
            }}
          >
            Confirm return
          </Button>
          {returning.data ? (
            <p role="status">Refund {formatGhanaMoney(returning.data.refundTotal)}</p>
          ) : null}

          {!compact ? (
            <>
              <ul className="flex flex-wrap gap-2">
                {products.map((product) => (
                  <li key={product.id}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setReplacementId(product.id);
                      }}
                    >
                      Add {product.name}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={() => {
                  exchanging.mutate();
                }}
              >
                Confirm exchange
              </Button>
              {exchanging.data ? (
                <p role="status">Net amount {exchanging.data.refundTotal}</p>
              ) : null}
            </>
          ) : null}

          <TextField
            label="Void reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              voiding.mutate();
            }}
          >
            Void this sale
          </Button>
          {voiding.data ? <p role="status">Sale voided</p> : null}
          {toProblem(returning.error) ? (
            <ProblemSummary problem={toProblem(returning.error)} />
          ) : null}
          {toProblem(exchanging.error) ? (
            <ProblemSummary problem={toProblem(exchanging.error)} />
          ) : null}
          {toProblem(voiding.error) ? (
            <ProblemSummary problem={toProblem(voiding.error)} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
