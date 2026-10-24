/**
 * One invoice line inside a CustomerGroupItem: number, date, source, status, amounts and action
 * buttons.
 *
 * Used by: components/invoice/CustomerGroupItem.jsx
 */

import { Download, Pencil, ReceiptText } from "lucide-react";
import { ActionButton, StatusBadge } from "./InvoiceUi.jsx";
import { getInvoiceFigures } from "../../utils/InvoiceMath.js";
import { fmtINR, sourceOf } from "../../utils/InvoiceListHelpers.js";

/* ════════════════════════════════════════════════════════════════════
   INVOICE TABLE ROW — click the row for details + refund/return actions
════════════════════════════════════════════════════════════════════ */
const cellPad = "14px 18px";

export function InvoiceTableRow({
  inv: invoice,
  onOpen,
  onDownload,
  onEdit,
  downloading,
  onDownloadCreditNotes,
  cnBusy,
}) {
  const fig = getInvoiceFigures(invoice);
  const owed = fig.pendingRefund;
  const creditNoteCount = (invoice.creditNoteIds || []).length;
  const creditUsed = (invoice.appliedCredits || []).reduce(
    (total, appliedCredit) => total + Number(appliedCredit.amount || 0),
    0
  );

  return (
    <tr
      onClick={() => onOpen(invoice)}
      style={{
        borderTop: "1px solid var(--table-row-border)",
        cursor: "pointer",
        transition: "background .15s",
      }}
      onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(249,115,22,.04)")}
      onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: cellPad, whiteSpace: "nowrap" }}>
        <div style={{ fontWeight: 800, color: "#ea580c", fontSize: 15 }}>
          {invoice.invoiceNumber ? `#${String(invoice.invoiceNumber).replace(/^#+/, "")}` : "—"}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: "var(--text-dim)" }}>
          <span style={{ color: sourceOf(invoice).color }}>{sourceOf(invoice).label}</span>
          {invoice.createdByName && (
            <>
              {" "}
              · by <span style={{ color: "var(--text-muted)" }}>{invoice.createdByName}</span>
            </>
          )}
        </div>
      </td>
      <td
        style={{ padding: cellPad, fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}
      >
        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—"}
      </td>
      <td style={{ padding: cellPad, whiteSpace: "nowrap" }}>
        <div style={{ fontWeight: 800, color: "var(--text-white)", fontSize: 15 }}>
          {fmtINR(invoice.summary?.totalPayAmount)}
        </div>
        {fig.hasReturn && (
          <div
            title="Value of goods returned on this invoice"
            style={{ fontSize: 10, fontWeight: 700, color: "#ca8a04", marginTop: 3 }}
          >
            ↩ {fmtINR(fig.returnedValue)} returned
          </div>
        )}
      </td>
      <td style={{ padding: cellPad }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <StatusBadge status={invoice.status} />
          {fig.settledBack > 0.01 && (
            <span
              title="Given back to the customer (credit note / refund)"
              style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}
            >
              {fmtINR(fig.settledBack)} refunded / credited
            </span>
          )}
          {owed > 0.01 && (
            <span
              title="Still owed back to this customer"
              style={{ fontSize: 10, fontWeight: 700, color: "#ca8a04", whiteSpace: "nowrap" }}
            >
              {fmtINR(owed)} owed
            </span>
          )}
          {creditUsed > 0.01 && (
            <span
              title="Paid using the customer's credit note(s)"
              style={{ fontSize: 10, fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}
            >
              {fmtINR(creditUsed)} via credit
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: cellPad }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton
            icon={Download}
            label="Download Invoice"
            tone="orange"
            busy={downloading}
            onClick={() => onDownload(invoice.invoiceId || invoice._id)}
          />
          <ActionButton
            icon={Pencil}
            label="Edit Invoice"
            tone="amber"
            onClick={() => onEdit(invoice)}
          />
          {creditNoteCount > 0 && (
            <ActionButton
              icon={ReceiptText}
              tone="rose"
              busy={cnBusy}
              label={`Download Credit Note${creditNoteCount > 1 ? ` ×${creditNoteCount}` : ""}`}
              onClick={() => onDownloadCreditNotes(invoice)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
