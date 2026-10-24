/**
 * Credit-note section inside the invoice detail: notes issued on this invoice, notes used to pay
 * it, and where each one went.
 *
 * Credit-note picture of one invoice, shown inside the invoice detail modal:
 *     1. credit notes ISSUED on this invoice (return / refund owed back) and
 *        where each one has gone since (used on another invoice, paid back…)
 *     2. credit notes USED to pay this invoice, and which invoice they came from
 *   Full credit-note records are fetched by id so the numbers are current.
 *
 * Used by: components/invoice/InvoiceDetailModal.jsx
 * API: creditNoteService.getById
 */

import { useEffect, useState } from "react";
import { ReceiptText, ArrowDownLeft, ArrowUpRight, Download, Loader2 } from "lucide-react";
import { creditNoteService } from "../../backend/ApiService.js";
import {
  fmtINR,
  fmtDate,
  unwrap,
  methodLabel,
  downloadCreditNotePdf,
  CN_TYPE,
} from "../../utils/CreditNoteHelpers.js";
import { showError } from "../ui/Alert";

const hash = (value) => (value ? `#${String(value).replace(/^#+/, "")}` : "");

const STATUS = {
  open: { label: "Open — not used yet", color: "#0284c7", bg: "rgba(14,165,233,.12)" },
  partially_used: { label: "Partly used", color: "#d97706", bg: "rgba(245,158,11,.14)" },
  used: { label: "Fully used", color: "#16a34a", bg: "rgba(34,197,94,.14)" },
  cancelled: { label: "Cancelled", color: "#e11d48", bg: "rgba(244,63,94,.12)" },
};

const Pill = ({ color, bg: background, children }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: background,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const card = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  fontSize: 12,
};
const subHead = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-white)",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const hint = { fontSize: 11.5, color: "var(--text-dim)", margin: "3px 0 10px", lineHeight: 1.45 };

async function fetchMany(ids) {
  const out = await Promise.all(
    ids.map((id) =>
      creditNoteService
        .getById(id)
        .then(unwrap)
        .catch(() => null)
    )
  );
  return Object.fromEntries(
    out.filter(Boolean).map((creditNote) => [creditNote.creditNoteId, creditNote])
  );
}

export default function InvoiceCreditNotes({ invoice }) {
  const issuedIds = invoice.creditNoteIds || [];
  const applied = invoice.appliedCredits || [];
  const appliedIds = applied.map((appliedEntry) => appliedEntry.creditNoteId).filter(Boolean);

  const [cns, setCns] = useState({});
  const [loading, setLoading] = useState(false);
  const [pdfId, setPdfId] = useState(null);

  useEffect(() => {
    const ids = [...new Set([...issuedIds, ...appliedIds])];
    if (!ids.length) return;
    let alive = true;
    setLoading(true);
    fetchMany(ids)
      .then((map) => {
        if (alive) setCns(map);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.invoiceId]);

  const download = async (cnOrId, id) => {
    setPdfId(id);
    try {
      await downloadCreditNotePdf(cnOrId);
    } catch (error) {
      showError("Credit note PDF failed: " + error.message);
    } finally {
      setPdfId(null);
    }
  };

  const DlBtn = ({ cn: creditNote, id }) => (
    <button
      onClick={() => download(creditNote || id, id)}
      disabled={pdfId === id}
      title="Download credit note PDF"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 8,
        border: "1px solid rgba(244,63,94,.3)",
        background: "rgba(244,63,94,.08)",
        color: "#e11d48",
        fontSize: 11.5,
        fontWeight: 700,
        cursor: pdfId === id ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {pdfId === id ? <Loader2 size={13} className="cn-spin" /> : <Download size={13} />} PDF
    </button>
  );

  // Issued credit notes: full record if loaded, else what the invoice's refund history knows
  const fallbackIssued = (invoice.refundHistory || []).filter((refund) => refund.creditNoteId);
  const issued = issuedIds.map((id) => {
    const creditNote = cns[id];
    if (creditNote) return { id, cn: creditNote };
    const refund = fallbackIssued.find((x) => x.creditNoteId === id);
    return {
      id,
      cn: null,
      number: refund?.creditNoteNumber,
      amount: refund?.amount,
      at: refund?.refundedAt,
    };
  });

  const nothing = !issuedIds.length && !applied.length;

  return (
    <div>
      <h4
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-white)",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ReceiptText size={15} color="#e11d48" /> Credit Notes
        {loading && <Loader2 size={13} className="cn-spin" style={{ color: "var(--text-dim)" }} />}
      </h4>

      {nothing && (
        <div style={{ ...card, color: "var(--text-dim)" }}>
          No credit notes on this invoice — nothing was returned or refunded, and it wasn't paid
          using a credit note.
        </div>
      )}

      {/* 1 — issued on this invoice */}
      {issued.length > 0 && (
        <div
          style={{
            ...card,
            borderColor: "rgba(244,63,94,.28)",
            marginBottom: applied.length ? 10 : 0,
          }}
        >
          <div style={subHead}>
            <ArrowUpRight size={14} color="#e11d48" /> Issued on this invoice
          </div>
          <p style={hint}>
            Money owed back to the customer (return / refund) was given as a credit note instead of
            cash. The customer can use it on a future invoice, or it can be paid back.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {issued.map(({ id, cn: creditNote, number, amount, at }) => {
              const total =
                Number(
                  creditNote ? (creditNote.summary?.totalAmount ?? creditNote.amount) : amount
                ) || 0;
              const balance = Number(creditNote?.balance ?? 0);
              const statusConfig = creditNote ? STATUS[creditNote.status] || STATUS.open : null;
              const type = creditNote && CN_TYPE[creditNote.type];
              return (
                <div
                  key={id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                    background: "var(--bg-surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b
                      style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-white)" }}
                    >
                      {creditNote?.creditNoteNumber || number || id}
                    </b>
                    {type && (
                      <Pill color={type.color} bg="var(--bg-card)">
                        {type.label}
                      </Pill>
                    )}
                    {statusConfig && (
                      <Pill color={statusConfig.color} bg={statusConfig.bg}>
                        {statusConfig.label}
                      </Pill>
                    )}
                    <span
                      style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <b style={{ fontSize: 15, color: "var(--text-white)" }}>{fmtINR(total)}</b>
                      <DlBtn cn={creditNote} id={id} />
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)", marginTop: 6 }}>
                    Issued {fmtDate(creditNote?.creditNoteDate || creditNote?.createdAt || at)}
                    {creditNote?.reason ? ` · ${creditNote.reason}` : ""}
                    {creditNote && creditNote.status !== "cancelled" && (
                      <>
                        {" "}
                        ·{" "}
                        <b style={{ color: balance > 0.01 ? "#16a34a" : "var(--text-muted)" }}>
                          {balance > 0.01
                            ? `${fmtINR(balance)} still available to use`
                            : "nothing left to use"}
                        </b>
                      </>
                    )}
                  </div>
                  {(creditNote?.items || []).length > 0 && (
                    <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                      For:{" "}
                      {creditNote.items
                        .map((item) => `${item.qty ?? item.quantity} × ${item.description}`)
                        .join(", ")}
                    </div>
                  )}
                  {(creditNote?.usage || []).length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px dashed var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {creditNote.usage.map((usageEntry) => (
                        <div
                          key={usageEntry.usageId || usageEntry.at}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ color: "var(--text-light)" }}>
                            {usageEntry.kind === "applied" ? (
                              <>
                                Used to pay invoice{" "}
                                <b style={{ color: "#16a34a" }}>
                                  {hash(usageEntry.appliedToNumber) || usageEntry.appliedToId}
                                </b>
                              </>
                            ) : (
                              <>
                                Paid back to customer · {methodLabel(usageEntry.method)}
                                {usageEntry.reference ? ` (${usageEntry.reference})` : ""}
                              </>
                            )}
                            <span style={{ color: "var(--text-dim)" }}>
                              {" "}
                              · {fmtDate(usageEntry.at)}
                            </span>
                          </span>
                          <b style={{ color: "var(--text-white)" }}>{fmtINR(usageEntry.amount)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                  {creditNote?.status === "cancelled" && creditNote.cancelReason && (
                    <div style={{ color: "#e11d48", marginTop: 6 }}>
                      Cancelled: {creditNote.cancelReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2 — used to pay this invoice */}
      {applied.length > 0 && (
        <div style={{ ...card, borderColor: "rgba(34,197,94,.3)" }}>
          <div style={subHead}>
            <ArrowDownLeft size={14} color="#16a34a" /> Used to pay this invoice
          </div>
          <p style={hint}>
            Part of this invoice was paid with the customer's existing credit — this is already
            included in the Paid Amount below.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {applied.map((appliedEntry) => {
              const creditNote = cns[appliedEntry.creditNoteId];
              return (
                <div
                  key={appliedEntry.usageId || appliedEntry.creditNoteId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ color: "var(--text-light)" }}>
                      Paid with{" "}
                      <b style={{ fontFamily: "monospace", color: "var(--text-white)" }}>
                        {appliedEntry.creditNoteNumber || creditNote?.creditNoteNumber}
                      </b>
                      {creditNote?.invoiceNumber && (
                        <>
                          {" "}
                          — credit from invoice <b>{hash(creditNote.invoiceNumber)}</b>
                        </>
                      )}
                    </div>
                    <div style={{ color: "var(--text-dim)", marginTop: 2 }}>
                      {fmtDate(appliedEntry.appliedAt)}
                      {appliedEntry.appliedBy ? ` · by ${appliedEntry.appliedBy}` : ""}
                    </div>
                  </div>
                  <b style={{ fontSize: 15, color: "#16a34a" }}>{fmtINR(appliedEntry.amount)}</b>
                  <DlBtn cn={creditNote} id={appliedEntry.creditNoteId} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
