/**
 * Modal to raise a credit note by hand (rate difference, discount after billing, short supply,
 * goodwill), against an invoice or for a customer.
 *
 * Backend: POST /credit-note/manage/create
 * • Against an invoice (recommended): only paid / partly paid invoices that still have something
 * left to credit. The modal shows what already happened on the invoice (returns, refunds, credit
 * notes used, existing credit notes) and how much can still be credited.
 * • Without an invoice: just the customer details.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/CreditNotesPage.jsx, pages/InvoiceListPage.jsx
 * API: creditNoteService.create, creditNoteService.getAll, invoiceService.search
 */

import { useEffect, useMemo, useState } from "react";
import { FileMinus, Search, Plus, Trash2, Loader2, X as CloseIcon } from "lucide-react";
import { invoiceService, creditNoteService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";
import {
  CnModal,
  FieldLabel,
  Section,
  PrimaryBtn,
  GhostBtn,
  CnStatusBadge,
} from "./CreditNoteUi.jsx";
import { fmtINR, fmtDate, unwrap, REFUND_METHODS } from "../../utils/CreditNoteHelpers.js";
import { getInvoiceFigures } from "../../utils/InvoiceMath.js";
import { buildStory } from "../../utils/CreditNoteStory.js";
import { Stat } from "./Stat.jsx";

const REASONS = [
  "Rate difference",
  "Discount after billing",
  "Short supply",
  "Damaged / defective goods",
  "Goodwill",
  "Other",
];
const TODAY = new Date().toISOString().split("T")[0];
const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
const avgGst = (items = []) =>
  items.length
    ? round2(items.reduce((total, item) => total + Number(item.gstPercent || 0), 0) / items.length)
    : 5;
const BLANK_LINE = (gst = 5) => ({
  description: "",
  qty: "1",
  price: "",
  gstPercent: String(gst),
  hsnCode: "90212900",
});
const hash = (value) => `#${String(value ?? "").replace(/^#+/, "")}`;

const STATUS_LABEL = {
  paid: "Paid",
  partially_paid: "Partially paid",
  issued: "Unpaid",
  draft: "Draft",
  cancelled: "Cancelled",
};

/**
 * Props:
 *  - invoice?   preselect this invoice (from the Invoices page)
 *  - customer?  { companyName, contactPerson, contactNumber, address, gstin } prefill when no invoice
 *  - onClose()
 *  - onDone(creditNote)  saved — caller refreshes
 */
export default function CreateCreditNoteModal({
  invoice: presetInvoice,
  customer,
  onClose,
  onDone,
}) {
  const [linkInvoice, setLinkInvoice] = useState(true);
  const [invoice, setInvoice] = useState(presetInvoice || null);

  // invoice picker
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // credit notes already raised on the selected invoice
  const [invCns, setInvCns] = useState([]);
  const [cnLoading, setCnLoading] = useState(false);

  // manual customer
  const [billTo, setBillTo] = useState({
    companyName: customer?.companyName || "",
    contactPerson: customer?.contactPerson || "",
    contactNumber: customer?.contactNumber || "",
    address: customer?.address || "",
    gstin: customer?.gstin || "",
  });

  const [date, setDate] = useState(TODAY);
  const [reason, setReason] = useState(REASONS[0]);
  const [reasonText, setReasonText] = useState("");
  const [mode, setMode] = useState("amount"); // amount | items
  const [amount, setAmount] = useState("");
  const [gstPercent, setGstPercent] = useState(String(avgGst(presetInvoice?.items)));
  const [lines, setLines] = useState([BLANK_LINE(avgGst(presetInvoice?.items))]);
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Search paid invoices that still have something left to credit ── */
  useEffect(() => {
    if (!linkInvoice || invoice) return;
    let alive = true;
    setSearching(true);
    const timerId = setTimeout(async () => {
      try {
        const res = await invoiceService.search(searchText.trim(), 50);
        const data = unwrap(res);
        const list = data?.invoices ?? (Array.isArray(data) ? data : []);
        if (alive) {
          setResults(
            list.filter(
              (invoice) =>
                ["paid", "partially_paid"].includes(invoice.status) &&
                getInvoiceFigures(invoice).remainingCredit > 0.01
            )
          );
        }
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timerId);
    };
  }, [searchText, linkInvoice, invoice]);

  /* ── Load the credit notes already on the selected invoice ── */
  useEffect(() => {
    if (!invoice?.invoiceId) {
      setInvCns([]);
      return;
    }
    let alive = true;
    setCnLoading(true);
    creditNoteService
      .getAll({ invoiceId: invoice.invoiceId, limit: 50 })
      .then((res) => {
        if (alive) setInvCns(unwrap(res)?.creditNotes || []);
      })
      .catch(() => {
        if (alive) setInvCns([]);
      })
      .finally(() => {
        if (alive) setCnLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [invoice?.invoiceId]);

  const pickInvoice = (invoice) => {
    setInvoice(invoice);
    const averageGst = avgGst(invoice.items);
    setGstPercent(String(averageGst));
    setLines([BLANK_LINE(averageGst)]);
  };

  /* ── What can still be credited on this invoice ──
     Same rule as the backend: received − (refunded + pending) − manual credit notes */
  const fig = useMemo(() => (invoice ? getInvoiceFigures(invoice) : null), [invoice]);
  const manualCredited = useMemo(
    () =>
      invCns
        .filter((invCn) => invCn.type === "manual" && invCn.status !== "cancelled")
        .reduce(
          (total, invCn) => total + Number(invCn.summary?.totalAmount ?? invCn.amount ?? 0),
          0
        ),
    [invCns]
  );
  const maxCredit =
    invoice && fig ? round2(Math.max(0, fig.remainingCredit - manualCredited)) : Infinity;

  /* ── Totals preview (GST-inclusive, same formula as the backend) ── */
  const preview = useMemo(() => {
    const rows =
      mode === "amount"
        ? [{ qty: 1, price: Number(amount) || 0, gst: Number(gstPercent) || 0 }]
        : lines.map((line) => ({
            qty: Number(line.qty) || 0,
            price: Number(line.price) || 0,
            gst: Number(line.gstPercent) || 0,
          }));
    let total = 0,
      net = 0;
    rows.forEach((row) => {
      const lineTotal = round2(row.qty * row.price);
      total += lineTotal;
      net += round2(lineTotal / (1 + row.gst / 100));
    });
    return { total: round2(total), net: round2(net), tax: round2(total - net) };
  }, [mode, amount, gstPercent, lines]);

  const overLimit = !!invoice && preview.total > maxCredit + 0.01;

  const finalReason = reason === "Other" ? reasonText.trim() : reason;
  const validLines = lines.filter(
    (line) => line.description.trim() && Number(line.price) > 0 && Number(line.qty) > 0
  );
  const hasCustomer = linkInvoice
    ? !!invoice
    : !!(billTo.companyName.trim() || billTo.contactPerson.trim());
  const canSave =
    !saving &&
    hasCustomer &&
    !!finalReason &&
    preview.total > 0 &&
    !overLimit &&
    (mode === "amount" || validLines.length === lines.length);

  const setLine = (lineIndex, field, value) =>
    setLines((prevLines) =>
      prevLines.map((line, idx) => (idx === lineIndex ? { ...line, [field]: value } : line))
    );

  const addFromInvoiceItem = (item) => {
    const lineGst = String(item.gstPercent ?? gstPercent);
    const perUnit = item.qty
      ? round2(Number(item.totalAmount || item.price * item.qty) / item.qty)
      : Number(item.price || 0);
    setLines((prevLines) => {
      const base =
        prevLines.length === 1 && !prevLines[0].description && !prevLines[0].price ? [] : prevLines;
      return [
        ...base,
        {
          description: item.description,
          qty: "1",
          price: String(perUnit),
          gstPercent: lineGst,
          hsnCode: item.hsnCode || "90212900",
        },
      ];
    });
  };

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = {
        reason: finalReason,
        creditNoteDate: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
      };
      if (linkInvoice && invoice) body.invoiceId = invoice.invoiceId;
      else body.billTo = { ...billTo, contactNumber: billTo.contactNumber.trim() };

      if (mode === "amount") {
        body.amount = round2(amount);
        body.gstPercent = Number(gstPercent) || 0;
      } else {
        body.items = validLines.map((validLine) => ({
          description: validLine.description.trim(),
          qty: Number(validLine.qty),
          price: Number(validLine.price),
          gstPercent: Number(validLine.gstPercent) || 0,
          hsnCode: validLine.hsnCode || "90212900",
        }));
      }
      if (payNow) {
        body.refundMethod = method;
        body.reference = reference.trim() || undefined;
      }

      const res = await creditNoteService.create(body);
      onDone?.(unwrap(res));
    } catch (error) {
      showError(error.message || "Couldn't create the credit note");
    } finally {
      setSaving(false);
    }
  }

  const tabBtn = (active) => ({
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
    border: active ? "1px solid var(--orange-ring)" : "1px solid var(--border-mid)",
    background: active ? "var(--orange-dim)" : "transparent",
    color: active ? "var(--orange)" : "var(--text-muted)",
  });

  const creditViaCn = (invoice?.appliedCredits || []).reduce(
    (total, appliedCredit) => total + Number(appliedCredit.amount || 0),
    0
  );

  return (
    <CnModal
      title="New Credit Note"
      subtitle={
        invoice
          ? `Against ${hash(invoice.invoiceNumber)} · ${invoice.billTo?.companyName || ""}`
          : "Raised by hand"
      }
      icon={FileMinus}
      width={760}
      onClose={onClose}
      footer={
        <>
          <div style={{ marginRight: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            Credit value{" "}
            <strong style={{ color: "var(--orange)", fontSize: 15 }}>
              {fmtINR(preview.total)}
            </strong>
            {invoice && (
              <span style={{ marginLeft: 10, fontSize: 11, color: "var(--text-dim)" }}>
                (max {fmtINR(maxCredit)})
              </span>
            )}
          </div>
          <GhostBtn onClick={onClose} disabled={saving}>
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={!canSave}>
            {saving ? (
              <>
                <Loader2 size={14} className="cn-spin" /> Saving…
              </>
            ) : (
              <>
                <FileMinus size={14} /> Create Credit Note
              </>
            )}
          </PrimaryBtn>
        </>
      }
    >
      {/* ── Customer / invoice ── */}
      <Section
        title="Credit against"
        right={
          !presetInvoice && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{ ...tabBtn(linkInvoice), flex: "none", padding: "4px 10px", fontSize: 10 }}
                onClick={() => setLinkInvoice(true)}
              >
                An invoice
              </button>
              <button
                style={{ ...tabBtn(!linkInvoice), flex: "none", padding: "4px 10px", fontSize: 10 }}
                onClick={() => setLinkInvoice(false)}
              >
                No invoice
              </button>
            </div>
          )
        }
      >
        {linkInvoice ? (
          invoice && fig ? (
            <>
              {/* Invoice header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  background: "var(--bg-base)",
                  border: "1px solid var(--orange-ring)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 900,
                        color: "#ea580c",
                        fontSize: 13,
                      }}
                    >
                      {hash(invoice.invoiceNumber)}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(34,197,94,.12)",
                        color: "#16a34a",
                      }}
                    >
                      {STATUS_LABEL[invoice.status] || invoice.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-white)",
                      marginTop: 2,
                    }}
                  >
                    {invoice.billTo?.companyName}{" "}
                    {invoice.billTo?.contactPerson && (
                      <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
                        · {invoice.billTo.contactPerson}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                    {fmtDate(invoice.invoiceDate)} · {invoice.billTo?.contactNumber || "no phone"}
                  </div>
                </div>
                {!presetInvoice && (
                  <button
                    onClick={() => setInvoice(null)}
                    title="Change invoice"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                    }}
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>

              {/* What happened on this invoice */}
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(14,165,233,.07)",
                  border: "1px solid rgba(14,165,233,.25)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#0284c7",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  What happened on this invoice
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontSize: 12,
                    color: "var(--text-light)",
                    lineHeight: 1.6,
                  }}
                >
                  {buildStory(invoice, fig).map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>

              {/* Money summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Stat label="Invoice total" value={fmtINR(fig.total)} />
                {fig.hasReturn && (
                  <Stat
                    label="Goods returned"
                    value={`− ${fmtINR(fig.returnedValue)}`}
                    color="#ca8a04"
                  />
                )}
                <Stat
                  label="Paid by customer"
                  value={fmtINR(fig.received)}
                  color="#16a34a"
                  sub={
                    creditViaCn > 0.01 ? `incl. ${fmtINR(creditViaCn)} via credit note` : undefined
                  }
                />
                {fig.settledBack > 0.01 && (
                  <Stat
                    label="Already refunded / credited"
                    value={fmtINR(fig.settledBack)}
                    color="#6366f1"
                  />
                )}
                {fig.pendingRefund > 0.01 && (
                  <Stat label="Refund pending" value={fmtINR(fig.pendingRefund)} color="#ca8a04" />
                )}
                {manualCredited > 0.01 && (
                  <Stat
                    label="Manual credit notes"
                    value={fmtINR(manualCredited)}
                    color="#7c3aed"
                  />
                )}
                <Stat
                  label="Balance due"
                  value={fmtINR(fig.balanceDue)}
                  color={fig.balanceDue > 0.01 ? "#e11d48" : "#16a34a"}
                />
                <Stat
                  label="Can still be credited"
                  value={fmtINR(maxCredit)}
                  color="var(--orange)"
                  sub="max for this credit note"
                />
              </div>

              {/* Items */}
              {(invoice.items || []).length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    overflowX: "auto",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 9,
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11.5,
                      minWidth: 420,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "var(--bg-base)" }}>
                        {["Item", "Qty", "Rate", "Total", "Returned"].map((label, index) => (
                          <th
                            key={label}
                            style={{
                              textAlign: index === 0 ? "left" : "right",
                              padding: "6px 10px",
                              fontSize: 9,
                              color: "var(--text-dim)",
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => {
                        const returnedQty = Number(item.returnedQty) || 0;
                        return (
                          <tr
                            key={item.itemId || index}
                            style={{ borderTop: "1px solid var(--border-dim)" }}
                          >
                            <td style={{ padding: "6px 10px", color: "var(--text-white)" }}>
                              {item.description}
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "right",
                                color: "var(--text-muted)",
                              }}
                            >
                              {item.qty}
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "right",
                                color: "var(--text-muted)",
                              }}
                            >
                              {fmtINR(item.price)}
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "right",
                                color: "var(--text-white)",
                                fontWeight: 700,
                              }}
                            >
                              {fmtINR(item.totalAmount)}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>
                              {returnedQty > 0 ? (
                                <span
                                  style={{
                                    background: "rgba(234,179,8,.14)",
                                    color: "#ca8a04",
                                    borderRadius: 999,
                                    padding: "1px 7px",
                                    fontSize: 10,
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
              )}

              {/* Credit notes already on this invoice */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 6,
                  }}
                >
                  Credit notes already on this invoice
                </div>
                {cnLoading ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Loading…</div>
                ) : invCns.length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>None yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {invCns.map((invCn) => {
                      const used = (invCn.usage || []).filter(
                        (usageEntry) => usageEntry.kind === "applied"
                      );
                      return (
                        <div
                          key={invCn.creditNoteId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            background: "var(--bg-base)",
                            border: "1px solid var(--border-dim)",
                            borderRadius: 9,
                            padding: "7px 10px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: 11.5,
                              color: "var(--text-white)",
                            }}
                          >
                            {invCn.creditNoteNumber}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-dim)",
                              textTransform: "capitalize",
                            }}
                          >
                            {invCn.type}
                          </span>
                          <CnStatusBadge status={invCn.status} />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 10.5,
                              color: "var(--text-dim)",
                              minWidth: 120,
                            }}
                          >
                            {used.length > 0
                              ? `used on ${used.map((usage) => hash(usage.appliedToNumber || usage.appliedToId)).join(", ")}`
                              : Number(invCn.balance) > 0.01
                                ? `${fmtINR(invCn.balance)} still usable`
                                : ""}
                          </span>
                          <b style={{ fontSize: 12, color: "var(--text-white)" }}>
                            {fmtINR(invCn.summary?.totalAmount ?? invCn.amount)}
                          </b>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  value={searchText}
                  autoFocus
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search invoice number or company…"
                />
              </div>
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {searching ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)", padding: 10 }}>
                    Searching…
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)", padding: 10 }}>
                    No invoices found. A credit note can only be raised on an invoice the customer
                    has paid (fully or partly) and that still has something left to credit — fully
                    returned &amp; refunded invoices are hidden.
                  </div>
                ) : (
                  results.map((result) => {
                    const figures = getInvoiceFigures(result);
                    return (
                      <button
                        key={result.invoiceId}
                        onClick={() => pickInvoice(result)}
                        className="cn-pick-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          textAlign: "left",
                          background: "var(--bg-base)",
                          border: "1px solid var(--border-dim)",
                          borderRadius: 9,
                          padding: "9px 12px",
                          cursor: "pointer",
                          color: "inherit",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 900,
                            color: "#ea580c",
                            fontSize: 12,
                            minWidth: 70,
                          }}
                        >
                          {hash(result.invoiceNumber)}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            className="truncate"
                            style={{
                              display: "block",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--text-white)",
                            }}
                          >
                            {result.billTo?.companyName}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                            {fmtDate(result.invoiceDate)} ·{" "}
                            {STATUS_LABEL[result.status] || result.status}
                            {figures.hasReturn && (
                              <>
                                {" "}
                                ·{" "}
                                <span style={{ color: "#ca8a04" }}>
                                  {fmtINR(figures.returnedValue)} returned
                                </span>
                              </>
                            )}
                            {figures.settledBack > 0.01 && (
                              <>
                                {" "}
                                ·{" "}
                                <span style={{ color: "#6366f1" }}>
                                  {fmtINR(figures.settledBack)} refunded/credited
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                        <span style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "block",
                              fontWeight: 800,
                              color: "var(--text-white)",
                              fontSize: 12,
                            }}
                          >
                            {fmtINR(result.summary?.totalPayAmount)}
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: "var(--orange)" }}>
                            can credit {fmtINR(figures.remainingCredit)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            className="cn-grid-2"
          >
            {[
              ["companyName", "Company / Clinic *"],
              ["contactPerson", "Contact person"],
              ["contactNumber", "Mobile no."],
              ["gstin", "GSTIN"],
            ].map(([key, label]) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  className="input"
                  value={billTo[key]}
                  onChange={(event) =>
                    setBillTo((prevBillTo) => ({ ...prevBillTo, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Address</FieldLabel>
              <textarea
                className="input"
                rows={2}
                value={billTo.address}
                style={{ resize: "vertical" }}
                onChange={(event) =>
                  setBillTo((prevBillTo) => ({ ...prevBillTo, address: event.target.value }))
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1", fontSize: 10, color: "var(--text-ghost)" }}>
              Use the customer's mobile number — that's how "Check credit" finds this credit note on
              their next invoice.
            </div>
          </div>
        )}
      </Section>

      {/* ── Details ── */}
      <Section title="Details">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}
          className="cn-grid-2"
        >
          <div>
            <FieldLabel>Credit note date</FieldLabel>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Reason *</FieldLabel>
            <select
              className="input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          {reason === "Other" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <input
                className="input"
                value={reasonText}
                onChange={(event) => setReasonText(event.target.value)}
                placeholder="Write the reason…"
                autoFocus
              />
            </div>
          )}
        </div>
      </Section>

      {/* ── Value ── */}
      <Section
        title="Credit value"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{
                ...tabBtn(mode === "amount"),
                flex: "none",
                padding: "4px 10px",
                fontSize: 10,
              }}
              onClick={() => setMode("amount")}
            >
              One amount
            </button>
            <button
              style={{
                ...tabBtn(mode === "items"),
                flex: "none",
                padding: "4px 10px",
                fontSize: 10,
              }}
              onClick={() => setMode("items")}
            >
              Line items
            </button>
          </div>
        }
      >
        {mode === "amount" ? (
          <div
            style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}
            className="cn-grid-2"
          >
            <div>
              <FieldLabel
                hint={invoice ? `max ${fmtINR(maxCredit)} · GST inclusive` : "GST inclusive"}
              >
                Amount (₹) *
              </FieldLabel>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                style={{ fontSize: 15, fontWeight: 800 }}
              />
            </div>
            <div>
              <FieldLabel>GST %</FieldLabel>
              <select
                className="input"
                value={gstPercent}
                onChange={(event) => setGstPercent(event.target.value)}
              >
                {[...new Set(["0", "5", "12", "18", "28", gstPercent])].map((gstOption) => (
                  <option key={gstOption} value={gstOption}>
                    {gstOption}%
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            {invoice?.items?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>
                  Add from invoice:
                </span>
                {invoice.items.map((item, index) => (
                  <button
                    key={item.itemId || index}
                    onClick={() => addFromInvoiceItem(item)}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      cursor: "pointer",
                      background: "var(--orange-dim)",
                      border: "1px solid var(--orange-ring)",
                      color: "var(--orange)",
                    }}
                  >
                    + {item.description}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lines.map((line, index) => {
                const lineTotal = round2((Number(line.qty) || 0) * (Number(line.price) || 0));
                return (
                  <div
                    key={index}
                    className="cn-line-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.8fr 60px 100px 70px 90px 28px",
                      gap: 8,
                      alignItems: "end",
                      background: "var(--bg-base)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: 9,
                      padding: 10,
                    }}
                  >
                    <div className="cn-line-desc">
                      <FieldLabel>Description</FieldLabel>
                      <input
                        className="input"
                        value={line.description}
                        onChange={(event) => setLine(index, "description", event.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel>Qty</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(event) => setLine(index, "qty", event.target.value)}
                        style={{ textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Rate ₹</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.price}
                        onChange={(event) => setLine(index, "price", event.target.value)}
                        style={{ textAlign: "right" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>GST %</FieldLabel>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={line.gstPercent}
                        onChange={(event) => setLine(index, "gstPercent", event.target.value)}
                        style={{ textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Total</FieldLabel>
                      <div
                        style={{
                          background: "var(--orange-dim)",
                          border: "1px solid var(--orange-ring)",
                          borderRadius: 10,
                          padding: "10px 10px",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "var(--orange)",
                          textAlign: "right",
                        }}
                      >
                        {fmtINR(lineTotal)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setLines((prevLines) =>
                          prevLines.length > 1
                            ? prevLines.filter((_, x) => x !== index)
                            : [BLANK_LINE(gstPercent)]
                        )
                      }
                      title="Remove"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-ghost)",
                        cursor: "pointer",
                        paddingBottom: 10,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setLines((prevLines) => [...prevLines, BLANK_LINE(gstPercent)])}
              style={{
                marginTop: 8,
                width: "100%",
                background: "none",
                border: "1px dashed var(--border-mid)",
                borderRadius: 9,
                padding: "8px 0",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Plus size={13} /> Add line
            </button>
            <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 6 }}>
              Rates are GST-inclusive, same as the invoice.
            </div>
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 18,
            marginTop: 12,
            fontSize: 11,
            color: "var(--text-dim)",
            flexWrap: "wrap",
          }}
        >
          <span>
            Taxable <strong style={{ color: "var(--text-white)" }}>{fmtINR(preview.net)}</strong>
          </span>
          <span>
            GST <strong style={{ color: "var(--text-white)" }}>{fmtINR(preview.tax)}</strong>
          </span>
          <span>
            Total <strong style={{ color: "var(--orange)" }}>{fmtINR(preview.total)}</strong>
          </span>
        </div>
        {overLimit && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--red)" }}>
            More than the {fmtINR(maxCredit)} that can still be credited on this invoice — reduce
            the amount.
          </div>
        )}
      </Section>

      {/* ── Settlement ── */}
      <Section title="What happens to the money">
        <div style={{ display: "flex", gap: 8, marginBottom: payNow ? 12 : 0 }}>
          <button style={tabBtn(!payNow)} onClick={() => setPayNow(false)}>
            Keep as store credit
          </button>
          <button style={tabBtn(payNow)} onClick={() => setPayNow(true)}>
            Pay back now
          </button>
        </div>
        {!payNow && (
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 8 }}>
            Stays open — use it on this customer's unpaid invoice or via "Check credit" on their
            next invoice.
          </div>
        )}
        {payNow && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}
            className="cn-grid-2"
          >
            <div>
              <FieldLabel>Method</FieldLabel>
              <select
                className="input"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {REFUND_METHODS.map((refundMethod) => (
                  <option key={refundMethod.value} value={refundMethod.value}>
                    {refundMethod.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Reference</FieldLabel>
              <input
                className="input"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="UTR / transaction id…"
              />
            </div>
          </div>
        )}
      </Section>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          style={{ resize: "vertical" }}
        />
      </div>
    </CnModal>
  );
}
