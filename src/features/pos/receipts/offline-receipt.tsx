import { QRCodeSVG } from "qrcode.react";

export interface OfflineReceiptProps {
  clientSaleId: string;
  registerId: string;
  occurredAt: string;
  lines: Array<{ name: string; qty: string; lineTotal: string }>;
  grandTotal: string;
  qrPayload: string;
  finalReceiptNumber?: string | null;
}

export function OfflineProvisionalReceipt(props: OfflineReceiptProps) {
  return (
    <article aria-label="Provisional offline receipt" className="space-y-3">
      <header>
        <h2>Pending sync</h2>
        <p>This is a provisional receipt. It is not the final fiscal document.</p>
      </header>
      <dl>
        <div>
          <dt>Client sale ID</dt>
          <dd>{props.clientSaleId}</dd>
        </div>
        <div>
          <dt>Register</dt>
          <dd>{props.registerId}</dd>
        </div>
        <div>
          <dt>Occurred at</dt>
          <dd>{props.occurredAt}</dd>
        </div>
      </dl>
      <table>
        <caption>Sale lines</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Qty</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {props.lines.map((line) => (
            <tr key={`${line.name}-${line.qty}-${line.lineTotal}`}>
              <td>{line.name}</td>
              <td>{line.qty}</td>
              <td>{line.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Grand total: <strong>{props.grandTotal}</strong>
      </p>
      {props.finalReceiptNumber ? (
        <p>
          Final receipt {props.finalReceiptNumber} is separate and does not replace this
          provisional identity.
        </p>
      ) : null}
      <div aria-label="Provisional QR">
        <QRCodeSVG value={props.qrPayload} size={128} />
      </div>
    </article>
  );
}
