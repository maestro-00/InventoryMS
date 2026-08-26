import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isProblemError } from "../../shared/api/errors/problem-error";
import { useSession } from "../../shared/auth/session-context";
import {
  isRegisterUnlocked,
  isRegisterUnlockedForShift,
} from "../../shared/auth/register-auth-store";
import { Button } from "../../shared/ui/button";
import { TextField } from "../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../shared/ui/states/ui-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs";
import {
  fetchProductByBarcode,
  fetchProducts,
} from "../catalogue/products/api/products-api";
import { useLocations } from "../inventory/locations/api/location-queries";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { fetchStock } from "../inventory/opening-stock/api/opening-stock-api";
import { FIRST_SALE_STEP } from "../onboarding/completion";
import { useMarkOnboardingStep } from "../onboarding/mark-onboarding-step";
import {
  fetchRegisters,
  openShiftsQueryKey,
  type ShiftRecord,
} from "../registers/registers/api/registers-api";
import { RegisterForm } from "../registers/registers/register-form";
import { OpenShift } from "../registers/shifts/open-shift";
import { useOpenShifts } from "../registers/shifts/use-open-shifts";
import { useOnlineStatus } from "../../shared/hooks/use-online-status";
import { listPendingSales } from "../offline-sync/offline-sale-repository";
import { setPendingSaleCount } from "../offline-sync/pending-sale-count-store";
import { setPosCartActive } from "./pos-location-guard-store";
import { CameraScanner } from "./acquisition/camera-scanner";
import { FavouritesGrid } from "./acquisition/favourites-grid";
import { HardwareScanner } from "./acquisition/hardware-scanner";
import { ProductSearch } from "./acquisition/product-search";
import { UnknownBarcode } from "./acquisition/unknown-barcode";
import { AfterSalePanel } from "./after-sale/after-sale-panel";
import {
  cartErrors,
  cartReducer,
  createCart,
  removeLine,
  scanProduct,
  setDiscount,
  setNote,
  setQuantity,
  toSaleLines,
  type CartProduct,
  type CartState,
} from "./cart/cart-store";
import { PaymentPanel } from "./checkout/payment-panel";
import {
  completeEligibleOfflineSale,
  type OfflineCompletionResult,
} from "./checkout/offline-checkout";
import { completeSale, SaleSubmissionGuard } from "./checkout/online-checkout";
import { holdSale } from "./held-sales/api/held-sales-api";
import { HeldSalesPanel } from "./held-sales/held-sales-panel";
import { OfflineProvisionalReceipt } from "./receipts/offline-receipt";
import { ReceiptView } from "./receipts/receipt-view";
import { SaleHistory } from "./sales/sale-history";
import type { SaleRecord } from "./sales/api/sales-api";
import { RegisterPinUnlock } from "../registers/pin-unlock/register-pin-unlock";
import { PosPrerequisiteWizard } from "./pos-prerequisite-wizard";

type Panel = "sell" | "receipt" | "history" | "provisional";

export function PosWorkspace({
  preferredShiftId,
}: {
  preferredShiftId?: string;
} = {}) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const isOnline = useOnlineStatus();
  const locations = useLocations();
  const locationId = useActiveLocationId();
  const markOnboardingStep = useMarkOnboardingStep();
  const canSell = session?.permissions.includes("Sell") === true;

  const registers = useQuery({
    queryKey: ["registers", locationId],
    queryFn: () => fetchRegisters(locationId),
    enabled: locationId !== "",
  });
  const {
    entries: openShiftEntries,
    isPending: openShiftsPending,
    isError: openShiftsError,
    error: openShiftsLoadError,
  } = useOpenShifts({
    enabled: canSell && isOnline && locationId !== "",
    locationId,
  });
  const products = useQuery({
    queryKey: ["pos-products", locationId],
    queryFn: () => fetchProducts({ pageSize: 200 }),
    enabled: isOnline,
  });
  const stock = useQuery({
    queryKey: ["stock", locationId],
    queryFn: () => fetchStock({ locationId }),
    enabled: locationId !== "" && isOnline,
  });

  const [shift, setShift] = useState<ShiftRecord | null>(null);
  const [cart, setCart] = useState<CartState>(() => createCart());
  const [cashReceived, setCashReceived] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [provisional, setProvisional] = useState<OfflineCompletionResult | null>(null);
  const [panel, setPanel] = useState<Panel>("sell");
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const previousLocationId = useRef(locationId);
  const guard = useRef(
    new SaleSubmissionGuard<
      | { mode: "offline"; result: OfflineCompletionResult }
      | { mode: "online"; result: SaleRecord }
    >(),
  );

  useEffect(() => {
    setPosCartActive(cart.lines.length > 0);
    return () => {
      setPosCartActive(false);
    };
  }, [cart.lines.length]);

  useEffect(() => {
    if (previousLocationId.current && previousLocationId.current !== locationId) {
      setCart(createCart());
      setCashReceived("");
      setClientErrors([]);
      setShift(null);
      setSale(null);
      setProvisional(null);
      setPanel("sell");
      setUnknownBarcode(null);
    }
    previousLocationId.current = locationId;
  }, [locationId]);

  // Prefer an explicit selection; then ?shiftId= when it matches an open shift;
  // otherwise hydrate the sole server open shift.
  const preferredOpenShift = preferredShiftId
    ? (openShiftEntries.find((entry) => entry.shift.id === preferredShiftId)?.shift ??
      null)
    : null;
  const activeShift =
    shift ??
    preferredOpenShift ??
    (openShiftEntries.length === 1 ? (openShiftEntries[0]?.shift ?? null) : null);

  const resumableEntries = activeShift ? [] : openShiftEntries;

  const onShiftOpened = useCallback(
    (opened: ShiftRecord) => {
      setShift(opened);
      void queryClient.invalidateQueries({ queryKey: openShiftsQueryKey });
    },
    [queryClient],
  );

  const onCompleted = useCallback(
    (completed: SaleRecord) => {
      setSale(completed);
      setProvisional(null);
      setPanel("receipt");
      void queryClient.invalidateQueries({ queryKey: ["stock"] });
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      void queryClient.invalidateQueries({ queryKey: ["held-sales"] });
      markOnboardingStep(FIRST_SALE_STEP);
    },
    [markOnboardingStep, queryClient],
  );

  const onProvisionalCompleted = (result: OfflineCompletionResult) => {
    setProvisional(result);
    setSale(null);
    setPanel("provisional");
    setCart(createCart());
    setCashReceived("");
    if (session?.tenantId && activeShift?.registerId) {
      void listPendingSales(session.tenantId, activeShift.registerId).then((sales) => {
        setPendingSaleCount(sales.length);
      });
    }
  };

  const checkout = useMutation({
    mutationFn: async (): Promise<
      | { mode: "offline"; result: OfflineCompletionResult }
      | { mode: "online"; result: SaleRecord }
    > =>
      guard.current.run(async () => {
        const payments = [{ tender: "Cash" as const, amount: cashReceived }];
        if (!isOnline) {
          if (!session?.tenantId) {
            throw new Error("Sign in is required before completing an offline sale.");
          }
          const registerId = activeShift?.registerId ?? "";
          const shiftId = activeShift?.id ?? "";
          const unlocked = shiftId
            ? isRegisterUnlockedForShift(session.tenantId, registerId, shiftId)
            : isRegisterUnlocked(session.tenantId, registerId);
          if (!unlocked) {
            throw new Error(
              "Unlock the till with your register PIN before completing offline sales.",
            );
          }
          return {
            mode: "offline" as const,
            result: await completeEligibleOfflineSale({
              tenantId: session.tenantId,
              registerId,
              shiftId,
              cart,
              payments,
            }),
          };
        }
        return {
          mode: "online" as const,
          result: await completeSale({
            clientSaleId: cart.clientSaleId,
            registerId: activeShift?.registerId ?? "",
            shiftId: activeShift?.id ?? "",
            lines: toSaleLines(cart),
            payments,
          }),
        };
      }),
    onSuccess: (outcome) => {
      if (outcome.mode === "offline") {
        onProvisionalCompleted(outcome.result);
        return;
      }
      onCompleted(outcome.result);
    },
  });

  const hold = useMutation({
    mutationFn: () =>
      holdSale({
        clientSaleId: cart.clientSaleId,
        registerId: activeShift?.registerId ?? "",
        shiftId: activeShift?.id ?? "",
        lines: toSaleLines(cart),
      }),
    onSuccess: () => {
      setCart(createCart());
      setCashReceived("");
      void queryClient.invalidateQueries({ queryKey: ["held-sales"] });
    },
  });

  const stockByProduct = useMemo(() => {
    const map = new Map<string, string>();
    for (const level of stock.data?.items ?? []) {
      map.set(level.productId, level.qtyOnHand);
    }
    return map;
  }, [stock.data]);

  const addProduct = useCallback((product: CartProduct) => {
    setCart((current) => cartReducer(current, scanProduct(product)));
    setUnknownBarcode(null);
  }, []);

  const onBarcode = useCallback(
    async (barcode: string) => {
      try {
        const product = await fetchProductByBarcode(barcode);
        addProduct({
          productId: product.id,
          productName: product.name,
          ...(product.barcode ? { barcode: product.barcode } : {}),
          allowFractional: product.allowFractional,
          catalogUnitPrice: product.sellingPrice,
          ...(product.taxTreatmentCode
            ? { taxTreatmentCode: product.taxTreatmentCode }
            : {}),
          status: product.status,
        });
      } catch (error) {
        if (isProblemError(error) && error.problem.kind === "notFound") {
          setUnknownBarcode(barcode);
          return;
        }
        throw error;
      }
    },
    [addProduct],
  );

  // Use isLoading (pending+fetching), not isPending alone: disabled or idle
  // queries report isPending without data and would unmount the register/shift
  // forms mid-typing (Firefox Playwright detach/stability flakes).
  if (locations.isLoading || (isOnline && products.isLoading)) {
    return <LoadingState label="Loading the sales workspace" />;
  }
  if (locations.isError) return <ProblemSummary problem={toProblem(locations.error)} />;
  if (locationId === "") {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Sell</h1>
        <PosPrerequisiteWizard
          hasLocation={false}
          hasRegister={false}
          hasOpenShift={false}
        />
      </section>
    );
  }

  function startNewSale() {
    setCart(createCart());
    setCashReceived("");
    setSale(null);
    setProvisional(null);
    setPanel("sell");
    guard.current.reset();
    checkout.reset();
  }

  function takePayment() {
    const errors = cartErrors(cart);
    if (cashReceived.trim() === "")
      errors.push("Enter the cash received from the customer.");
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }
    setClientErrors([]);
    checkout.mutate();
  }

  const problem = toProblem(checkout.error);
  const registerId = activeShift?.registerId ?? registers.data?.[0]?.id ?? "";
  const tenantId = session?.tenantId ?? "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <h1 className="text-2xl font-semibold">Sell</h1>
        <HardwareScanner onScan={(barcode) => void onBarcode(barcode)} />

        {panel === "receipt" && sale ? (
          <>
            <ReceiptView
              sale={sale}
              onNewSale={startNewSale}
              onViewHistory={() => {
                setPanel("history");
              }}
            />
            {isOnline && activeShift ? (
              <AfterSalePanel
                compact
                initialSale={sale}
                registerId={registerId}
                shiftId={activeShift.id}
                products={products.data?.items ?? []}
              />
            ) : null}
          </>
        ) : null}

        {panel === "provisional" && provisional ? (
          <section className="flex flex-col gap-3">
            <OfflineProvisionalReceipt
              clientSaleId={provisional.clientSaleId}
              registerId={registerId}
              occurredAt={provisional.receipt.createdAt}
              lines={provisional.cart.lines.map((line) => ({
                name: line.name,
                qty: line.qty,
                lineTotal: line.lineTotal,
              }))}
              grandTotal={provisional.cart.grandTotal}
              qrPayload={provisional.receipt.qrPayload}
            />
            <Button type="button" onClick={startNewSale}>
              Start a new sale
            </Button>
          </section>
        ) : null}

        {panel === "history" ? (
          <section className="flex flex-col gap-3">
            <SaleHistory locationId={locationId} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPanel(sale ? "receipt" : provisional ? "provisional" : "sell");
              }}
            >
              Back to the till
            </Button>
          </section>
        ) : null}

        {panel === "sell" ? (
          registers.isLoading || (canSell && isOnline && openShiftsPending) ? (
            <LoadingState label="Loading registers and open shifts" />
          ) : (registers.data ?? []).length === 0 ? (
            <>
              <PosPrerequisiteWizard
                hasLocation
                hasRegister={false}
                hasOpenShift={false}
              />
              <RegisterForm
                locationId={locationId}
                onCreated={() => {
                  void registers.refetch();
                }}
              />
            </>
          ) : !activeShift ? (
            <div className="flex flex-col gap-6">
              <PosPrerequisiteWizard hasLocation hasRegister hasOpenShift={false} />
              {openShiftsError ? (
                <ProblemSummary problem={toProblem(openShiftsLoadError)} />
              ) : null}
              {resumableEntries.length > 0 ? (
                <section
                  className="flex flex-col gap-3 rounded-md border p-4"
                  aria-label="Resume an open shift"
                >
                  <h2 className="text-lg font-semibold">Resume an open shift</h2>
                  <p className="text-sm text-muted-foreground">
                    A shift is already open. Resume it to keep selling, or open a new
                    shift below if you have another register.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {resumableEntries.map((entry) => (
                      <li key={entry.shift.id}>
                        <Button
                          type="button"
                          onClick={() => {
                            setShift(entry.shift);
                          }}
                        >
                          Resume shift on {entry.registerName}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <OpenShift registers={registers.data ?? []} onOpened={onShiftOpened} />
            </div>
          ) : (
            <Tabs defaultValue="sell">
              <TabsList>
                <TabsTrigger value="sell">Sell</TabsTrigger>
                <TabsTrigger value="returns" disabled={!isOnline}>
                  Returns
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sell">
                <section className="flex flex-col gap-4">
                  <RegisterPinUnlock registerId={registerId} shiftId={activeShift.id} />
                  {!isOnline ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      Offline mode: live-only actions stay disabled. Eligible cash and
                      local tenders queue for sync.
                    </p>
                  ) : null}
                  {clientErrors.length > 0 ? (
                    <ProblemSummary
                      key={clientErrors.join("|")}
                      messages={clientErrors}
                      title="Check the sale"
                    />
                  ) : null}
                  {problem ? <ProblemSummary problem={problem} /> : null}
                  {toProblem(hold.error) ? (
                    <ProblemSummary problem={toProblem(hold.error)} />
                  ) : null}

                  <CameraScanner onScan={(barcode) => void onBarcode(barcode)} />
                  {isOnline ? (
                    <ProductSearch onAdd={addProduct} />
                  ) : (
                    <p className="text-sm text-muted-foreground" role="status">
                      Live product search is unavailable offline. Use the prepared
                      register catalogue or barcode scan.
                    </p>
                  )}
                  <FavouritesGrid
                    registerId={registerId}
                    products={products.data?.items ?? []}
                    onAdd={addProduct}
                  />
                  {unknownBarcode ? (
                    <UnknownBarcode
                      barcode={unknownBarcode}
                      onCreated={addProduct}
                      onDismiss={() => {
                        setUnknownBarcode(null);
                      }}
                    />
                  ) : null}

                  <ul className="flex min-h-32 flex-col gap-3">
                    {cart.lines.map((line) => (
                      <li
                        key={line.productId}
                        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
                      >
                        <TextField
                          label={`Quantity for ${line.productName}`}
                          inputMode="decimal"
                          value={line.qty}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCart((current) =>
                              cartReducer(current, setQuantity(line.productId, value)),
                            );
                          }}
                        />
                        <TextField
                          label={`Discount for ${line.productName}`}
                          inputMode="decimal"
                          value={line.lineDiscount}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCart((current) =>
                              cartReducer(current, setDiscount(line.productId, value)),
                            );
                          }}
                        />
                        <TextField
                          label={`Note for ${line.productName}`}
                          value={line.note}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCart((current) =>
                              cartReducer(current, setNote(line.productId, value)),
                            );
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCart((current) =>
                              cartReducer(current, removeLine(line.productId)),
                            );
                          }}
                        >
                          Remove {line.productName}
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <TextField
                    label="Cash received"
                    inputMode="decimal"
                    hint={
                      isOnline
                        ? "InventoryX calculates the total, tax, and change due."
                        : "Provisional total uses catalog prices until sync confirms."
                    }
                    value={cashReceived}
                    onChange={(event) => {
                      setCashReceived(event.target.value);
                    }}
                  />
                  <span className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={checkout.isPending}
                      aria-busy={checkout.isPending}
                      onClick={takePayment}
                    >
                      {checkout.isPending
                        ? "Taking payment…"
                        : isOnline
                          ? "Take cash payment"
                          : "Complete offline cash sale"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isOnline}
                      title={
                        isOnline
                          ? undefined
                          : "Holding a sale requires a live connection."
                      }
                      onClick={() => {
                        hold.mutate();
                      }}
                    >
                      Hold this sale
                    </Button>
                  </span>

                  <PaymentPanel
                    cart={cart}
                    registerId={registerId}
                    shiftId={activeShift.id}
                    tenantId={tenantId}
                    isOnline={isOnline}
                    onCartChange={setCart}
                    onCompleted={onCompleted}
                    onProvisionalCompleted={onProvisionalCompleted}
                  />
                  <HeldSalesPanel
                    products={products.data?.items ?? []}
                    stockByProduct={stockByProduct}
                    onRecall={(heldSale) => {
                      setCart((current) => ({
                        ...current,
                        heldSaleId: heldSale.id,
                        quote: heldSale,
                        clientSaleId: heldSale.clientSaleId,
                        lines: heldSale.lines.map((line) => ({
                          productId: line.productId,
                          productName: line.productName,
                          allowFractional: true,
                          catalogUnitPrice: line.unitPrice,
                          status: "Active",
                          qty: line.qty,
                          lineDiscount: line.lineDiscount,
                          note: line.note ?? "",
                        })),
                      }));
                    }}
                  />
                </section>
              </TabsContent>
              <TabsContent value="returns">
                {isOnline ? (
                  <AfterSalePanel
                    registerId={registerId}
                    shiftId={activeShift.id}
                    products={products.data?.items ?? []}
                  />
                ) : (
                  <p role="status">
                    Returns, exchanges, voids, and on-account charging are live-only and
                    unavailable while offline.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-2 lg:w-72" aria-label="Stock on hand">
        <h2 className="text-lg font-semibold">Stock on hand</h2>
        <p className="text-sm text-muted-foreground">
          {isOnline
            ? "Other-location availability requires a live connection."
            : "Other-location availability is live-only and hidden while offline."}
        </p>
        {!isOnline ? (
          <p className="text-sm text-muted-foreground" role="status">
            Live stock levels are unavailable offline. Effective quantities come from
            the prepared register snapshot after scan.
          </p>
        ) : stock.isLoading ? (
          <LoadingState label="Loading stock" />
        ) : (
          <ul className="flex flex-col gap-1">
            {(products.data?.items ?? []).map((product) => (
              <li key={product.id}>
                {product.name}: {stockByProduct.get(product.id) ?? "0"} on hand
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
