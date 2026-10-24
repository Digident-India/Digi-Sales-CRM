/**
 * Full view of one invoice: customer, items, totals, returns, refunds and credit notes, with the
 * actions on it.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/InvoiceListPage.jsx
 */

import { useEffect } from "react";
import {
  X as CloseIcon,
  User,
  Building,
  FileText,
  Undo2,
  IndianRupee,
  Download,
  Pencil,
  ReceiptText,
} from "lucide-react";
import { ActionButton, StatusBadge } from "./InvoiceUi";
import InvoiceCreditNotes from "./InvoiceCreditNotes";
import { getInvoiceFigures } from "../../utils/InvoiceMath";

const inr = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const day = (date) => (date ? new Date(date).toLocaleDateString("en-IN") : "N/A");

const label = { fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4 };
const box = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
};
const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-white)",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const headerCellStyle = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-dim)",
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};
const cellStyle = {
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--text-light)",
  borderBottom: "1px solid var(--table-row-border)",
};
const row = { display: "flex", justifyContent: "space-between" };
const subRow = { ...row, paddingLeft: 12, color: "var(--text-dim)" };

/* Invoice details + the money actions (settle refund, record return,
   credit note). Those actions are handled by the page, which owns their
   modals — this one just closes and hands the invoice over. */
const InvoiceDetailModal = ({
  invoice,
  onClose,
  onDownload,
  onEdit,
  onDownloadCreditNotes,
  cnBusy,
  onSettle,
  onReturn,
}) => {
  // Prevent background scrolling while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!invoice) return null;

  const refundableAmount = Number(invoice.refundableAmount || 0);
  const hasRefundOwed = refundableAmount > 0.01;
  // Manual-order and ecommerce invoices have their own return flow on the
  // order — "Record return" only applies to a standalone invoice.
  const isStandalone = !invoice.sourceOrderId;
  // Returns / credit notes refund money actually received, so only once paid.
  const hasBeenPaid = invoice.status === "paid" || invoice.status === "partially_paid";
  const creditNoteCount = (invoice.creditNoteIds || []).length;
  const creditUsed = (invoice.appliedCredits || []).reduce(
    (total, appliedCredit) => total + Number(appliedCredit.amount || 0),
    0
  );
  // Credit-note refunds are shown in the Credit Notes section — only list cash/UPI/etc. here
  const cashRefunds = (invoice.refundHistory || []).filter(
    (refund) => !refund.creditNoteId && refund.method !== "credit_note"
  );
  const creditNoteRefunds = (invoice.refundHistory || []).filter(
    (refund) => refund.creditNoteId || refund.method === "credit_note"
  );
  const summary = invoice.summary || {};

  // Correct paid / returned / balance figures (see invoiceMath.js)
  const fig = getInvoiceFigures(invoice);

  // Show "Record return" only while units are left to return AND money is still
  // there to refund. Once a credit note has fully used up the paid amount it
  // disappears; it comes back if anything is left.
  // (Manual "Create credit note" was removed — credit notes are only viewed /
  // downloaded here; they're created by the return / settle flows.)
  const canReturn =
    isStandalone && hasBeenPaid && fig.returnableQty > 0 && fig.remainingCredit > 0.01;

  const handOff = (callback) => () => {
    onClose();
    callback(invoice);
  };

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={(event) => event.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: "var(--text-white)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileText size={21} color="#f97316" /> Invoice #
                {String(invoice.invoiceNumber || "N/A").replace(/^#+/, "")}
              </h2>
              <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                ID: {invoice.invoiceId || invoice._id}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 6,
                borderRadius: 999,
              }}
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <ActionButton
              icon={Download}
              label="Download Invoice"
              tone="orange"
              onClick={() => onDownload(invoice.invoiceId || invoice._id)}
            />
            <ActionButton
              icon={Pencil}
              label="Edit Invoice"
              tone="amber"
              onClick={handOff(onEdit)}
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
            {hasRefundOwed && (
              <ActionButton
                icon={IndianRupee}
                label="Settle refund"
                tone="amber"
                onClick={handOff(onSettle)}
              />
            )}
            {canReturn && (
              <ActionButton
                icon={Undo2}
                label="Record return"
                tone="orange"
                onClick={handOff(onReturn)}
              />
            )}
            {isStandalone && !hasBeenPaid && (
              <span
                style={{
                  alignSelf: "center",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "var(--text-dim)",
                }}
                title="A return can only be recorded once this invoice has been paid."
              >
                Return available once paid
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          {/* Refund still owed */}
          {hasRefundOwed && (
            <div
              style={{
                ...box,
                background: "rgba(234,179,8,.08)",
                borderColor: "rgba(234,179,8,.35)",
              }}
            >
              <p style={{ fontWeight: 700, color: "#ca8a04" }}>
                {inr(refundableAmount)} owed to this customer
              </p>
              <p style={{ fontSize: 12, color: "#ca8a04", marginTop: 2 }}>
                {invoice.refundStatus === "partial_refunded"
                  ? "Partially settled so far — settle the rest when it's paid back or credited."
                  : "Not settled yet — settle it once it's paid back or credited."}
              </p>
            </div>
          )}

          {/* Returned + already settled — tells the user the money trail at a glance */}
          {fig.hasReturn && !hasRefundOwed && fig.settledBack > 0.01 && (
            <div
              style={{
                ...box,
                background: "rgba(5,150,105,.07)",
                borderColor: "rgba(5,150,105,.3)",
              }}
            >
              <p style={{ fontWeight: 700, color: "#059669" }}>
                {fig.fullyReturned ? "Fully returned & settled" : "Returned goods settled"}
              </p>
              <p style={{ fontSize: 12, color: "#059669", marginTop: 2 }}>
                {inr(fig.returnedValue)} of goods returned. {inr(fig.settledBack)} given back
                {creditNoteRefunds.length > 0
                  ? ` as credit note ${creditNoteRefunds
                      .map((creditNoteRefund) => creditNoteRefund.creditNoteNumber)
                      .filter(Boolean)
                      .join(", ")}`
                  : ""}
                . Nothing is pending on this invoice.
              </p>
            </div>
          )}

          {/* General info */}
          <div
            className="inv-meta-grid"
            style={{ ...box, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
          >
            <div>
              <span style={label}>Status</span>
              <StatusBadge status={invoice.status} />
            </div>
            <div>
              <span style={label}>Invoice Date</span>
              <b style={{ color: "var(--text-white)" }}>{day(invoice.invoiceDate)}</b>
            </div>
            <div>
              <span style={label}>Due Date</span>
              <b style={{ color: "var(--text-white)" }}>{day(invoice.dueDate)}</b>
            </div>
            <div>
              <span style={label}>Rep. Person</span>
              <b style={{ color: "var(--text-white)" }}>{invoice.customerServiceRep || "N/A"}</b>
            </div>
            {invoice.createdByName && (
              <div>
                <span style={label}>Created By</span>
                <b style={{ color: "var(--text-white)" }}>{invoice.createdByName}</b>
              </div>
            )}
            {invoice.clientId && (
              <div>
                <span style={label}>Client ID</span>
                <b style={{ color: "var(--green)", fontFamily: "monospace" }}>{invoice.clientId}</b>
              </div>
            )}
          </div>

          <InvoiceCreditNotes invoice={invoice} />

          {/* Seller / Bill to */}
          <div
            className="inv-billto-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {invoice.seller && (
              <div style={box}>
                <h4 style={sectionTitleStyle}>
                  <Building size={15} /> Seller Details
                </h4>
                <p style={{ fontWeight: 700, color: "var(--text-white)" }}>
                  {invoice.seller.companyName}
                </p>
                <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                  {invoice.seller.address}
                </p>
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  <b>GSTIN:</b> {invoice.seller.gstin}
                </p>
                <p style={{ fontSize: 12 }}>
                  <b>Email:</b> {invoice.seller.email}
                </p>
              </div>
            )}
            {invoice.billTo && (
              <div style={box}>
                <h4 style={sectionTitleStyle}>
                  <User size={15} /> Billed To
                </h4>
                <p
                  style={{
                    fontWeight: 700,
                    color: "var(--text-white)",
                    textTransform: "capitalize",
                  }}
                >
                  {invoice.billTo.companyName}
                </p>
                <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                  {invoice.billTo.address}
                </p>
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  <b>Contact:</b> {invoice.billTo.contactPerson} ({invoice.billTo.contactNumber})
                </p>
                {invoice.billTo.gstin && (
                  <p style={{ fontSize: 12 }}>
                    <b>GSTIN:</b> {invoice.billTo.gstin}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Logistics */}
          <div
            className="inv-meta-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              fontSize: 12,
              borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              padding: "12px 0",
            }}
          >
            <div>
              <b>Order No:</b> {invoice.orderNumber || "N/A"}
            </div>
            <div>
              <b>Terms of Delivery:</b> {invoice.termsOfDelivery || "N/A"}
            </div>
            <div>
              <b>Shipping:</b> {invoice.shippingCondition || "N/A"}
            </div>
            <div>
              <b>Payment Terms:</b> {invoice.paymentTerms || "N/A"}
            </div>
          </div>

          {/* Items */}
          {invoice.items?.length > 0 && (
            <div>
              <h4 style={sectionTitleStyle}>Itemized Breakdown</h4>
              <div
                style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead style={{ background: "var(--table-head-bg)" }}>
                    <tr>
                      {["Art No.", "Description", "Qty", "Price", "Tax", "Total", "Returned"].map(
                        (label, index) => (
                          <th
                            key={label}
                            style={{ ...headerCellStyle, textAlign: index > 1 ? "right" : "left" }}
                          >
                            {label}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const returnedQty = Number(item.returnedQty) || 0;
                      return (
                        <tr key={item.itemId || index}>
                          <td style={{ ...cellStyle, fontWeight: 600 }}>{item.articleNo}</td>
                          <td style={cellStyle}>{item.description}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{item.qty}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{inr(item.price)}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>
                            {item.gstPercent}% ({inr(item.gstAmount)})
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontWeight: 700,
                              color: "var(--text-white)",
                            }}
                          >
                            {inr(item.totalAmount)}
                          </td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>
                            {returnedQty > 0 ? (
                              <span
                                style={{
                                  background: "rgba(234,179,8,.12)",
                                  color: "#ca8a04",
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {returnedQty} returned
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-ghost)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Returns */}
          {invoice.returns?.length > 0 && (
            <div>
              <h4 style={sectionTitleStyle}>Returns</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {invoice.returns.map((ret, idx) => (
                  <div
                    key={ret.requestId || idx}
                    style={{
                      ...box,
                      padding: 12,
                      fontSize: 12,
                      background: "rgba(234,179,8,.06)",
                      borderColor: "rgba(234,179,8,.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <b style={{ color: "#ca8a04" }}>{ret.requestId}</b>
                      <span>
                        {ret.requestedAt
                          ? new Date(ret.requestedAt).toLocaleString("en-IN")
                          : "N/A"}
                      </span>
                    </div>
                    <ul style={{ marginTop: 6, paddingLeft: 16, color: "var(--text-light)" }}>
                      {(ret.items || []).map((item, index) => (
                        <li key={item.itemId || index}>
                          {item.quantity} × {item.description} — {inr(item.price)} each
                          {item.reason ? ` (${item.reason})` : ""}
                        </li>
                      ))}
                    </ul>
                    {ret.processedBy && (
                      <p style={{ marginTop: 4, color: "var(--text-dim)" }}>
                        Processed by {ret.processedBy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund history (cash / UPI / bank …). Credit-note refunds are in the Credit Notes section. */}
          {cashRefunds.length > 0 && (
            <div>
              <h4 style={sectionTitleStyle}>Refund History</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cashRefunds.map((cashRefund, idx) => (
                  <div
                    key={cashRefund.refundId || idx}
                    style={{
                      ...box,
                      padding: 12,
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--text-white)" }}>
                        {inr(cashRefund.amount)} · {cashRefund.method?.replace(/_/g, " ")}
                      </p>
                      <p style={{ color: "var(--text-dim)" }}>
                        {cashRefund.refundedAt
                          ? new Date(cashRefund.refundedAt).toLocaleString("en-IN")
                          : "N/A"}
                        {cashRefund.refundedBy ? ` · by ${cashRefund.refundedBy}` : ""}
                      </p>
                      {cashRefund.notes && <p style={{ marginTop: 2 }}>{cashRefund.notes}</p>}
                    </div>
                    <StatusBadge status={cashRefund.refundStatus || "paid"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {invoice.summary && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 310,
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                }}
              >
                <div style={row}>
                  <span>Net Value:</span>
                  <span>{inr(summary.totalNet)}</span>
                </div>
                <div style={row}>
                  <span>Total Tax:</span>
                  <span>{inr(summary.totalTax)}</span>
                </div>
                {Number(summary.freightCost) > 0 && (
                  <div style={row}>
                    <span>Freight:</span>
                    <span>{inr(summary.freightCost)}</span>
                  </div>
                )}
                <div
                  style={{
                    ...row,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text-white)",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 8,
                  }}
                >
                  <span>Grand Total:</span>
                  <span style={{ color: "#ea580c" }}>{inr(summary.totalPayAmount)}</span>
                </div>

                {fig.hasReturn && (
                  <>
                    <div style={{ ...row, color: "#ca8a04", fontWeight: 600 }}>
                      <span>Returned goods:</span>
                      <span>− {inr(fig.returnedValue)}</span>
                    </div>
                    <div style={{ ...row, fontWeight: 700, color: "var(--text-white)" }}>
                      <span>Net Payable:</span>
                      <span>{inr(fig.netPayable)}</span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    ...row,
                    color: "#059669",
                    fontWeight: 600,
                    borderTop: "1px dashed var(--border)",
                    paddingTop: 8,
                  }}
                >
                  <span>Paid Amount:</span>
                  <span>{inr(fig.received)}</span>
                </div>
                {!fig.isOrderLinked && fig.settledBack > 0.01 && (
                  <div style={subRow}>
                    <span>↳ refunded / credit note issued</span>
                    <span>− {inr(fig.settledBack)}</span>
                  </div>
                )}
                {!fig.isOrderLinked && fig.pendingRefund > 0.01 && (
                  <div style={{ ...subRow, color: "#ca8a04" }}>
                    <span>↳ refund pending</span>
                    <span>− {inr(fig.pendingRefund)}</span>
                  </div>
                )}
                {creditUsed > 0.01 && (
                  <>
                    <div style={subRow}>
                      <span>↳ via credit note</span>
                      <span>{inr(creditUsed)}</span>
                    </div>
                    <div style={subRow}>
                      <span>↳ cash / bank</span>
                      <span>{inr(Math.max(0, fig.received - creditUsed))}</span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    ...row,
                    color: fig.balanceDue > 0.01 ? "#e11d48" : "#059669",
                    fontWeight: 700,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 8,
                  }}
                >
                  <span>Balance Due:</span>
                  <span>{inr(fig.balanceDue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bank details */}
          {invoice.bankDetails && (
            <div style={{ ...box, fontSize: 12 }}>
              <p style={{ fontWeight: 700, color: "var(--text-white)", marginBottom: 4 }}>
                Bank Account Transfer Details
              </p>
              <p>
                <b>Holder:</b> {invoice.bankDetails.holderName}
              </p>
              <p>
                <b>A/C No:</b> {invoice.bankDetails.accountNo} ({invoice.bankDetails.accountType})
              </p>
              <p>
                <b>IFSC Code:</b> {invoice.bankDetails.ifscCode}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
