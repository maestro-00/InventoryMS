export function BatchProductFields({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <fieldset>
      <legend>Batch tracking</legend>
      <label>
        Default FEFO <input type="checkbox" name="fefoDefault" defaultChecked />
      </label>
      <label>
        Require manufacture date <input type="checkbox" name="requireManufacture" />
      </label>
      <label>
        Require expiry date{" "}
        <input type="checkbox" name="requireExpiry" defaultChecked />
      </label>
    </fieldset>
  );
}
