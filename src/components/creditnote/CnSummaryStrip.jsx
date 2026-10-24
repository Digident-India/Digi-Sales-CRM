/**
 * Header strip of a credit-note modal: number, customer, total and balance left.
 *
 * Used by: components/creditnote/ApplyCreditNoteModal.jsx,
 * components/creditnote/RefundCreditNoteModal.jsx
 */

import { fmtINR } from "../../utils/CreditNoteHelpers.js";

/* Header strip that every action modal shows: number, customer, balance */
export function CnSummaryStrip({ cn: creditNote }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14,
      }}
    >
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontFamily: "monospace", fontWeight: 900, color: "#ea580c", fontSize: 13 }}>
          {creditNote.creditNoteNumber}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-white)", marginTop: 2 }}>
          {creditNote.billTo?.companyName}
          {creditNote.billTo?.contactPerson && (
            <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
              {" "}
              · {creditNote.billTo.contactPerson}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: 9,
            color: "var(--text-ghost)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          Balance
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80", fontFamily: "monospace" }}>
          {fmtINR(creditNote.balance)}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
          of {fmtINR(creditNote.summary?.totalAmount ?? creditNote.amount)}
        </div>
      </div>
    </div>
  );
}
