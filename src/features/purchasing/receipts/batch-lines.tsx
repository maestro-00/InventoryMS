export function BatchReceiptLines({
  requireExpiry = false,
  batchNumber,
  manufactureDate,
  expiryDate,
  onBatchNumberChange,
  onManufactureDateChange,
  onExpiryDateChange,
}: {
  requireExpiry?: boolean;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  onBatchNumberChange: (value: string) => void;
  onManufactureDateChange: (value: string) => void;
  onExpiryDateChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend>Batch lines</legend>
      <p>
        Damaged quantity is captured separately from saleable quantity so quarantine
        stock never mixes with sellable FEFO inventory.
      </p>
      <label className="block">
        Batch number
        <input
          name="batchNumber"
          required
          value={batchNumber}
          onChange={(event) => {
            onBatchNumberChange(event.target.value);
          }}
        />
      </label>
      <label className="block">
        Manufacture date
        <input
          type="date"
          name="manufactureDate"
          value={manufactureDate}
          onChange={(event) => {
            onManufactureDateChange(event.target.value);
          }}
        />
      </label>
      <label className="block">
        Expiry date
        <input
          type="date"
          name="expiryDate"
          required={requireExpiry}
          value={expiryDate}
          onChange={(event) => {
            onExpiryDateChange(event.target.value);
          }}
        />
      </label>
    </fieldset>
  );
}
