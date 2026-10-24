/**
 * Shows one credit note with its history, and opens the apply / pay back / cancel actions.
 *
 * API: creditNoteService.getById
 */

import { useEffect, useState } from "react";
import {
  ReceiptText,
  Wallet,
  FileMinus,
  Loader2,
  Download,
  Ban,
  ArrowRightLeft,
  Banknote,
} from "lucide-react";
import { creditNoteService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";
import {
  CnModal,
  Section,
  PrimaryBtn,
  GhostBtn,
  CnStatusBadge,
  CnTypeTag,
} from "./CreditNoteUi.jsx";
import {
  fmtINR,
  fmtDate,
  unwrap,
  methodLabel,
  isUsable,
  canCancel,
  downloadCreditNotePdf,
} from "../../utils/CreditNoteHelpers.js";
import { HistoryRow } from "./HistoryRow.jsx";

/* ════════════════════════════════════════════════════════════════════
   DETAIL
════════════════════════════════════════════════════════════════════ */
export function CreditNoteDetailModal({ cn: initial, onClose, onApply, onRefund, onCancel }) {
  const [creditNote, setCreditNote] = useState(initial);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Refresh from the server so usage history is complete
  useEffect(() => {
    let alive = true;
    creditNoteService
      .getById(initial.creditNoteId)
      .then((res) => {
        if (alive) setCreditNote(unwrap(res) || initial);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initial]);

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await downloadCreditNotePdf(creditNote);
    } catch (error) {
      showError("PDF failed: " + error.message);
    } finally {
      setPdfBusy(false);
    }
  };

  const summary = creditNote.summary || {};
  const detailRow = (label, value) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        fontSize: 12,
        padding: "4px 0",
      }}
    >
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span style={{ color: "var(--text-white)", fontWeight: 700, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );

  return (
    <CnModal
      title={creditNote.creditNoteNumber}
      subtitle={`${creditNote.billTo?.companyName || ""} · ${fmtDate(creditNote.creditNoteDate)}`}
      icon={ReceiptText}
      width={720}
      onClose={onClose}
      footer={
        <>
          {canCancel(creditNote) && (
            <button
              onClick={() => onCancel?.(creditNote)}
              style={{
                marginRight: "auto",
                background: "none",
                border: "1px solid rgba(239,68,68,.35)",
                color: "#f87171",
                borderRadius: 9,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ban size={13} /> Cancel credit note
            </button>
          )}
          <GhostBtn onClick={pdf} disabled={pdfBusy}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {pdfBusy ? <Loader2 size={13} className="cn-spin" /> : <Download size={13} />} PDF
            </span>
          </GhostBtn>
          {isUsable(creditNote) && (
            <>
              <PrimaryBtn color="#ca8a04" onClick={() => onRefund?.(creditNote)}>
                <Wallet size={14} /> Pay back
              </PrimaryBtn>
              <PrimaryBtn color="#16a34a" onClick={() => onApply?.(creditNote)}>
                <ArrowRightLeft size={14} /> Use on invoice
              </PrimaryBtn>
            </>
          )}
        </>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <CnStatusBadge status={creditNote.status} />
        <CnTypeTag type={creditNote.type} />
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>· {creditNote.reason}</span>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        className="cn-grid-2"
      >
        <Section title="Customer">
          {detailRow("Company", creditNote.billTo?.companyName || "—")}
          {detailRow("Contact", creditNote.billTo?.contactPerson || "—")}
          {detailRow("Mobile", creditNote.billTo?.contactNumber || "—")}
          {detailRow("GSTIN", creditNote.billTo?.gstin || "—")}
        </Section>
        <Section title="Against">
          {detailRow("Invoice", creditNote.invoiceNumber || "— (no invoice)")}
          {detailRow("Invoice date", fmtDate(creditNote.invoiceDate))}
          {detailRow(
            "Source",
            creditNote.sourceOrderType
              ? `${creditNote.sourceOrderType} order`
              : creditNote.invoiceId
                ? "Direct invoice"
                : "—"
          )}
          {detailRow("Created by", creditNote.createdBy || "—")}
        </Section>
      </div>

      <Section title={`Items (${(creditNote.items || []).length})`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 420 }}>
            <thead>
              <tr>
                {["Description", "Qty", "Rate", "GST", "Total"].map((label, index) => (
                  <th
                    key={label}
                    style={{
                      textAlign: index === 0 ? "left" : "right",
                      padding: "6px 8px",
                      fontSize: 9,
                      color: "var(--text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      borderBottom: "1px solid var(--border-dim)",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(creditNote.items || []).map((item, index) => (
                <tr
                  key={item.itemId || index}
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <td style={{ padding: "8px", color: "var(--text-white)" }}>{item.description}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)" }}>
                    {item.qty ?? item.quantity}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)" }}>
                    {fmtINR(item.price)}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)" }}>
                    {item.gstPercent}%
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      color: "var(--text-white)",
                      fontWeight: 700,
                    }}
                  >
                    {fmtINR(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", maxWidth: 260, marginTop: 10 }}>
          {detailRow("Taxable", fmtINR(summary.totalNet))}
          {detailRow("GST", fmtINR(summary.totalTax))}
          <div style={{ borderTop: "1px solid var(--border-dim)", marginTop: 4, paddingTop: 4 }}>
            {detailRow(
              "Credit value",
              <span style={{ color: "var(--orange)" }}>
                {fmtINR(summary.totalAmount ?? creditNote.amount)}
              </span>
            )}
            {detailRow(
              "Balance left",
              <span style={{ color: "#4ade80" }}>{fmtINR(creditNote.balance)}</span>
            )}
          </div>
        </div>
      </Section>

      <Section title="History">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <HistoryRow
            icon={FileMinus}
            color="#ea580c"
            date={creditNote.creditNoteDate}
            title={`Issued for ${fmtINR(summary.totalAmount ?? creditNote.amount)}`}
            sub={creditNote.createdBy}
          />
          {(creditNote.usage || []).map((usageEntry) => (
            <HistoryRow
              key={usageEntry.usageId}
              icon={usageEntry.kind === "applied" ? ArrowRightLeft : Banknote}
              color={usageEntry.kind === "applied" ? "#16a34a" : "#ca8a04"}
              date={usageEntry.at}
              title={
                usageEntry.kind === "applied"
                  ? `${fmtINR(usageEntry.amount)} used on invoice ${usageEntry.appliedToNumber || usageEntry.appliedToId || ""}`
                  : `${fmtINR(usageEntry.amount)} paid back · ${methodLabel(usageEntry.method)}${usageEntry.reference ? ` (${usageEntry.reference})` : ""}`
              }
              sub={[usageEntry.by, usageEntry.notes].filter(Boolean).join(" · ")}
            />
          ))}
          {creditNote.status === "cancelled" && (
            <HistoryRow
              icon={Ban}
              color="#f87171"
              date={creditNote.cancelledAt}
              title="Cancelled"
              sub={creditNote.cancelReason}
            />
          )}
        </div>
      </Section>

      {creditNote.notes && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <strong>Notes:</strong> {creditNote.notes}
        </div>
      )}
    </CnModal>
  );
}
