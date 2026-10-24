/**
 * One credit note line in the Credit Notes list: number, invoice, amounts, where it was used,
 * actions.
 *
 * Used by: pages/CreditNotesPage.jsx
 */

import { ChevronRight, FileText, FileDown, Loader2 } from "lucide-react";
import { fmtINR, fmtDate, methodLabel } from "../../utils/CreditNoteHelpers.js";
import {
  hash,
  avatarOf,
  fmtDateTime,
  TYPE_CHIP,
  STATUS_PILL,
} from "../../utils/CreditNoteListHelpers.js";
import { Chip } from "./Chip.jsx";

const cellStyle = { padding: "16px 12px", verticalAlign: "top" };

const muted = { fontSize: 12.5, color: "var(--text-muted)" };

/* ════════════════════════════════════════════════════════════════════
   ROW
════════════════════════════════════════════════════════════════════ */
export function CreditNoteRow({ cn: creditNote, pdfBusy, onPdf, onView }) {
  const summary = creditNote.summary || {};
  const total = Number(summary.totalAmount ?? creditNote.amount ?? 0);
  const balance = Number(creditNote.balance || 0);
  const used = Math.max(0, total - balance);
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const cancelled = creditNote.status === "cancelled";
  const type = TYPE_CHIP[creditNote.type] || {
    label: creditNote.type || "—",
    color: "var(--text-muted)",
    bg: "var(--bg-card)",
  };
  const status = STATUS_PILL[creditNote.status] || STATUS_PILL.open;
  const bill = creditNote.billTo || {};
  const name = bill.contactPerson || bill.companyName || "Unknown customer";
  const usage = creditNote.usage || [];

  return (
    <tr
      onClick={() => onView(creditNote)}
      style={{
        borderTop: "1px solid var(--table-row-border)",
        cursor: "pointer",
        transition: "background .15s",
        opacity: cancelled ? 0.6 : 1,
      }}
      onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(249,115,22,.04)")}
      onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
    >
      {/* Credit note */}
      <td style={cellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={18} color="#f97316" />
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: 13,
              color: "var(--text-white)",
              wordBreak: "break-all",
            }}
          >
            {creditNote.creditNoteNumber}
          </span>
        </div>
        <Chip color={type.color} bg={type.bg} style={{ marginTop: 10 }}>
          {type.label}
        </Chip>
        <div style={{ ...muted, marginTop: 14 }}>
          {fmtDateTime(creditNote.createdAt || creditNote.creditNoteDate)}
        </div>
        {creditNote.invoiceNumber && (
          <div style={{ ...muted, marginTop: 14 }}>
            Against{" "}
            <Chip color="var(--text-white)" bg="var(--bg-card)" mono>
              {hash(creditNote.invoiceNumber)}
            </Chip>
          </div>
        )}
        {creditNote.invoiceDate && (
          <div style={{ ...muted, marginTop: 10 }}>
            Invoice date {fmtDate(creditNote.invoiceDate)}
          </div>
        )}
      </td>

      {/* Customer */}
      <td style={cellStyle}>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              flexShrink: 0,
              background: "#111",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {avatarOf(name)}
          </div>
          <div style={{ minWidth: 0, lineHeight: 1.45 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-white)" }}>
              {name}
            </div>
            {bill.companyName && bill.companyName !== name && (
              <div style={{ ...muted, fontSize: 12.5, wordBreak: "break-word" }}>
                {bill.companyName}
              </div>
            )}
            {bill.contactNumber && (
              <div style={{ ...muted, fontSize: 12.5, wordBreak: "break-word" }}>
                {bill.contactNumber}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Reason & items */}
      <td style={cellStyle}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-white)" }}>
          {creditNote.reason || "—"}
        </div>
        {(creditNote.items || []).map((item, index) => (
          <div key={item.itemId || index} style={{ ...muted, fontSize: 13, marginTop: 4 }}>
            <b style={{ color: "var(--text-white)" }}>{item.qty ?? item.quantity} ×</b>{" "}
            {item.description} @ {fmtINR(item.price)}
          </div>
        ))}
      </td>

      {/* Amount */}
      <td style={{ ...cellStyle, width: 130 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-white)" }}>
          {fmtINR(total)}
        </div>
        {Number(summary.totalTax) > 0 && (
          <div style={{ ...muted, marginTop: 6 }}>incl. GST {fmtINR(summary.totalTax)}</div>
        )}
        {!cancelled && (
          <>
            <div
              style={{
                height: 7,
                borderRadius: 999,
                background: "var(--bg-card)",
                marginTop: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#16a34a",
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ ...muted, marginTop: 10 }}>
              {balance <= 0.01 ? "Fully used" : used > 0.01 ? `${fmtINR(balance)} left` : "Unused"}
            </div>
          </>
        )}
      </td>

      {/* Status & usage */}
      <td style={{ ...cellStyle, minWidth: 190 }}>
        <Chip
          color={status.color}
          bg={status.bg}
          style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12.5 }}
        >
          {status.label}
        </Chip>
        {usage.map((usageEntry) => (
          <div key={usageEntry.usageId || usageEntry.at} style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px 10px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-light)" }}>
                {usageEntry.kind === "applied" ? (
                  <>
                    Applied to{" "}
                    <Chip color="#16a34a" bg="rgba(34,197,94,.12)" mono>
                      {hash(usageEntry.appliedToNumber || usageEntry.appliedToId)}
                    </Chip>
                  </>
                ) : (
                  <>Paid back · {methodLabel(usageEntry.method)}</>
                )}
              </span>
              <b style={{ fontSize: 13, color: "var(--text-white)", whiteSpace: "nowrap" }}>
                {fmtINR(usageEntry.amount)}
              </b>
            </div>
            <div style={{ ...muted, marginTop: 4 }}>{fmtDateTime(usageEntry.at)}</div>
          </div>
        ))}
        {cancelled && creditNote.cancelReason && (
          <div style={{ ...muted, marginTop: 10 }}>{creditNote.cancelReason}</div>
        )}
      </td>

      {/* Actions */}
      <td style={cellStyle}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onView(creditNote);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--text-white)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            View <ChevronRight size={16} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPdf(creditNote);
            }}
            disabled={pdfBusy}
            title="Download credit note PDF"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--text-white)",
              cursor: pdfBusy ? "wait" : "pointer",
            }}
          >
            {pdfBusy ? <Loader2 size={18} className="cn-spin" /> : <FileDown size={18} />}
          </button>
        </div>
      </td>
    </tr>
  );
}
