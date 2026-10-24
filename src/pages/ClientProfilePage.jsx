/**
 * Screen "client-profile": everything about one client: details, contact buttons, billed / received
 * / due, invoices, credit notes and follow-ups.
 *
 * everything about one client, on one page.
 * Opened from the Client Book (click a client) or an invoice group.
 * • Details + Call / WhatsApp / Email + Create Invoice
 * • Billed / Received / Due / Overdue / Refund pending
 * • Invoices — click one to see the full invoice (PDF, edit, refund,
 *   return, credit note — same actions as the Invoices page)
 * • Follow-ups — post-sale touches (log a new one here), pre-sale history,
 *   call remarks
 * • Timeline · Details
 * Agents can only open clients assigned to them (checked by the backend).
 * No horizontal scrolling — invoice rows turn into cards on small screens.
 *
 * Screen key: "client-profile" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 * API: creditNoteService.getAll, invoiceService.getById, leadsApi.getClientProfile
 */

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { leadsApi, invoiceService, creditNoteService } from "../backend/ApiService";
import { useCrm } from "../context/CrmContext";
import TouchHistory from "../components/lead/TouchHistory";
import FollowupModal from "../components/followup/FollowupModal";
import { showError } from "../components/ui/Alert";
import InvoiceDetailModal from "../components/invoice/InvoiceDetailModal.jsx";
import UpdateInvoiceModal from "../components/invoice/UpdateInvoiceModal.jsx";
import SettleInvoiceCreditModal from "../components/invoice/SettleInvoiceCreditModal.jsx";
import RecordInvoiceReturnModal from "../components/invoice/RecordInvoiceReturnModal.jsx";
import { downloadCreditNotePdf } from "../utils/CreditNoteHelpers.js";
import { downloadInvoicePdf } from "../utils/InvoicePdf.js";
import { CSS } from "../constants/ClientProfileCss.js";

const LS_KEY = "crm-profile-client";
const inr = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const initials = (name = "") =>
  name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const STATUS = {
  paid: { label: "Paid", color: "#16a34a", bg: "rgba(34,197,94,.12)" },
  partially_paid: { label: "Partial", color: "#d97706", bg: "rgba(245,158,11,.14)" },
  issued: { label: "Unpaid", color: "#2563eb", bg: "rgba(59,130,246,.12)" },
  draft: { label: "Draft", color: "var(--text-dim)", bg: "var(--bg-card)" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "rgba(239,68,68,.12)" },
};
const DOT = {
  invoice: "#3b82f6",
  pre_sale: "#8b5cf6",
  post_sale: "#22c55e",
  remark: "#f59e0b",
  assignment: "var(--text-dim)",
  converted: "#22c55e",
  created: "var(--text-ghost)",
};

/* Turn the backend timeline titles into plain English */
const timelineTitle = (timelineEvent) => {
  if (timelineEvent.type === "created")
    return /direct/i.test(timelineEvent.title || "") ? "Client created directly" : "Lead created";
  return timelineEvent.title;
};

function Card({ label, value, note, color }) {
  return (
    <div className="cp-card">
      <div className="cp-card-label">{label}</div>
      <div className="cp-card-value" style={{ color: color || "var(--text-white)" }}>
        {value}
      </div>
      {note && <div className="cp-card-note">{note}</div>}
    </div>
  );
}

export default function ClientProfilePage({ clientId: propId, onBack, onNav }) {
  const { leads, isAdmin } = useCrm();
  const [clientId] = useState(() => {
    if (propId) {
      try {
        localStorage.setItem(LS_KEY, propId);
      } catch {
        /* ignore */
      }
      return propId;
    }
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("invoices");
  const [invFilter, setInvFilter] = useState("all");

  /* invoice detail + its actions */
  const [opening, setOpening] = useState(null); // invoiceId being loaded
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [cnBusy, setCnBusy] = useState(false);

  /* follow-up modal */
  const [touchModal, setTouchModal] = useState(null);

  const load = useCallback(() => {
    if (!clientId) {
      setError("No client selected");
      return;
    }
    setError("");
    leadsApi
      .getClientProfile(clientId)
      .then((res) => setData(res?.data ?? res))
      .catch((error) => setError(error.message || "Could not load this client"));
  }, [clientId]);
  useEffect(load, [load]);

  /* the live lead from context — follow-ups update here right after logging */
  const liveLead = leads.find((lead) => String(lead._id) === String(clientId));

  const openInvoice = async (invoice) => {
    if (opening) return;
    setOpening(invoice.invoiceId);
    try {
      const res = await invoiceService.getById(invoice.invoiceId);
      setDetailInvoice(res?.data ?? res);
    } catch (error) {
      showError("Could not open invoice: " + error.message);
    } finally {
      setOpening(null);
    }
  };

  const handleDownload = async (invoiceId) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (error) {
      showError("PDF failed: " + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCreditNotes = async (invoice) => {
    if (cnBusy) return;
    setCnBusy(true);
    try {
      const res = await creditNoteService.getAll({ invoiceId: invoice.invoiceId, limit: 50 });
      const list = (res?.data ?? res)?.creditNotes || [];
      if (!list.length) {
        showError("No credit notes found for this invoice");
        return;
      }
      for (const creditNote of list) await downloadCreditNotePdf(creditNote);
    } catch (error) {
      showError("Credit note PDF failed: " + error.message);
    } finally {
      setCnBusy(false);
    }
  };

  const offerCreditNotePdf = async (creditNote) => {
    if (!creditNote?.creditNoteNumber) return;
    const result = await Swal.fire({
      icon: "success",
      title: `Credit note ${creditNote.creditNoteNumber} created`,
      showCancelButton: true,
      confirmButtonText: "Download PDF",
      cancelButtonText: "Close",
      confirmButtonColor: "#ea580c",
    });
    if (result.isConfirmed) {
      try {
        await downloadCreditNotePdf(creditNote.creditNoteId || creditNote.creditNoteNumber);
      } catch (error) {
        showError("Credit note PDF failed: " + error.message);
      }
    }
  };

  const back = (
    <button onClick={onBack} className="cp-btn" style={{ marginBottom: 14 }}>
      <ArrowLeft size={14} /> Client Book
    </button>
  );

  if (error) {
    return (
      <div className="fade-in">
        <style>{CSS}</style>
        {back}
        <div className="cp-error">
          <AlertCircle size={14} /> {error}
          {clientId && (
            <button onClick={load} className="cp-link">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!data)
    return (
      <div className="fade-in">
        <style>{CSS}</style>
        {back}
        <div className="cp-dim" style={{ padding: 20 }}>
          Loading client…
        </div>
      </div>
    );

  const { client, summary, invoices, followups, timeline } = data;
  const phone = String(client.contact || "").replace(/\D/g, "");
  const whatsappNumber = phone.length === 10 ? `91${phone}` : phone;
  const createInvoice = () =>
    onNav?.("create-invoice", { ...client, stage: "client", invoices, returnTo: "client-profile" });

  const shownInvoices = invoices.filter((invoice) =>
    invFilter === "all"
      ? true
      : invFilter === "due"
        ? ["issued", "partially_paid"].includes(invoice.status) &&
          Number(invoice.summary?.amountToPay) > 0
        : invoice.status === invFilter
  );

  const postSale = liveLead?.postSaleFollowups ?? followups.postSale;
  const preSale = liveLead?.preSaleFollowups ?? followups.preSale;
  const remarks = liveLead?.remarkFollowups ?? followups.remark;
  const followCount = postSale.length + preSale.length + remarks.length;
  const account = liveLead || { ...client, postSaleFollowups: postSale };

  return (
    <div className="fade-in">
      <style>{CSS}</style>
      {back}

      {/* ── Header ── */}
      <div className="cp-head">
        <div className="cp-avatar">{initials(client.doctorName || client.clinicName)}</div>
        <div className="cp-head-main">
          <div className="cp-title-row">
            <h2 className="page-title" style={{ margin: 0 }}>
              {client.doctorName || client.clinicName}
            </h2>
            {client.clientId && (
              <span className="stage-badge badge-green" style={{ fontFamily: "monospace" }}>
                {client.clientId}
              </span>
            )}
            <span
              className={`stage-badge ${client.clientOrigin === "direct" ? "badge-orange" : "badge-green"}`}
            >
              {client.clientOrigin === "direct" ? "Direct" : "Converted"}
            </span>
          </div>
          <div className="cp-dim cp-mt4">
            {[client.clinicName, client.city, client.state].filter(Boolean).join(" · ")}
          </div>
          <div className="cp-dim cp-mt4">
            Agent:{" "}
            <b className="cp-muted">
              {client.assignedEmployee?.name || client.assignedAgent || "—"}
            </b>
            {client.contactBy && <> · Contact by: {client.contactBy}</>}
            {(liveLead?.nextFollowUpDate || followups.nextFollowUpDate) && (
              <>
                {" "}
                · Next follow-up:{" "}
                <b style={{ color: "#d97706" }}>
                  {fmtDate(liveLead?.nextFollowUpDate || followups.nextFollowUpDate)}
                </b>
              </>
            )}
          </div>
        </div>
        <div className="cp-actions">
          {phone && (
            <a className="cp-btn" href={`tel:${client.contact}`}>
              <Phone size={13} /> Call
            </a>
          )}
          {phone && (
            <a
              className="cp-btn"
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          {client.email && (
            <a className="cp-btn" href={`mailto:${client.email}`}>
              <Mail size={13} /> Email
            </a>
          )}
          <button className="cp-btn" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="btn btn-primary" onClick={createInvoice}>
            <FileText size={13} /> Create Invoice
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="cp-cards">
        <Card
          label="Total billed"
          value={inr(summary.totalBilled)}
          note={`${summary.totalInvoices - summary.cancelled} invoice${summary.totalInvoices - summary.cancelled === 1 ? "" : "s"}`}
        />
        <Card label="Received" value={inr(summary.totalPaid)} color="#16a34a" />
        <Card
          label="Due"
          value={inr(summary.totalDue)}
          color={summary.totalDue > 0 ? "#dc2626" : undefined}
          note={
            summary.overdueCount
              ? `${summary.overdueCount} overdue · ${inr(summary.overdueAmount)}`
              : "Nothing overdue"
          }
        />
        <Card
          label="Refund pending"
          value={inr(summary.refundPending)}
          color={summary.refundPending > 0 ? "#d97706" : undefined}
        />
        <Card
          label="Last invoice"
          value={fmtDate(summary.lastInvoiceAt)}
          note={`Average ${inr(summary.avgInvoiceValue)}`}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="cp-tabs">
        {[
          ["invoices", `Invoices (${invoices.length})`],
          ["followups", `Follow-ups (${followCount})`],
          ["timeline", "Timeline"],
          ["details", "Details"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`cp-tab${tab === key ? " on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Invoices ── */}
      {tab === "invoices" && (
        <>
          <div className="cp-pills">
            {[
              ["all", "All"],
              ["due", "Due"],
              ["paid", "Paid"],
              ["cancelled", "Cancelled"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setInvFilter(key)}
                className={`cp-pill${invFilter === key ? " on" : ""}`}
              >
                {label}
              </button>
            ))}
            <span className="cp-dim" style={{ marginLeft: "auto", fontSize: 11 }}>
              Click an invoice to see its full details
            </span>
          </div>
          {shownInvoices.length === 0 ? (
            <div className="cp-empty">
              {invoices.length ? "No invoices match this filter" : "No invoices yet"}
              {!invoices.length && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={createInvoice}>
                    Create the first invoice
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="cp-list">
              <div className="cp-inv cp-inv-head">
                <div>Invoice</div>
                <div>Date</div>
                <div>Products</div>
                <div className="cp-r">Amount</div>
                <div className="cp-r">Due</div>
                <div>Status</div>
                <div>Created by</div>
                <div />
              </div>
              {shownInvoices.map((shownInvoice) => {
                const statusConfig = STATUS[shownInvoice.status] || STATUS.draft;
                const due = ["issued", "partially_paid"].includes(shownInvoice.status)
                  ? Number(shownInvoice.summary?.amountToPay || 0)
                  : 0;
                const overdue =
                  due > 0 && shownInvoice.dueDate && new Date(shownInvoice.dueDate) < new Date();
                return (
                  <div
                    key={shownInvoice.invoiceId}
                    className="cp-inv cp-inv-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => openInvoice(shownInvoice)}
                    onKeyDown={(event) => event.key === "Enter" && openInvoice(shownInvoice)}
                  >
                    <div className="cp-invno">{shownInvoice.invoiceNumber}</div>
                    <div>
                      <span className="cp-lbl">Date</span>
                      {fmtDate(shownInvoice.invoiceDate)}
                      {overdue && (
                        <div className="cp-red cp-small">
                          Overdue since {fmtDate(shownInvoice.dueDate)}
                        </div>
                      )}
                    </div>
                    <div className="cp-min">
                      <span className="cp-lbl">Products</span>
                      <div
                        className="cp-ellipsis"
                        title={(shownInvoice.items || [])
                          .map((item) => `${item.description} ×${item.qty}`)
                          .join(", ")}
                      >
                        {(shownInvoice.items || [])
                          .map((item) => `${item.description} ×${item.qty}`)
                          .join(", ") || "—"}
                      </div>
                    </div>
                    <div className="cp-r cp-strong">
                      <span className="cp-lbl">Amount</span>
                      {inr(shownInvoice.summary?.totalPayAmount)}
                    </div>
                    <div className={`cp-r ${due > 0 ? "cp-red" : "cp-dim"}`}>
                      <span className="cp-lbl">Due</span>
                      {due > 0 ? inr(due) : "—"}
                    </div>
                    <div>
                      <span
                        className="cp-badge"
                        style={{ color: statusConfig.color, background: statusConfig.bg }}
                      >
                        {statusConfig.label}
                      </span>
                      {Number(shownInvoice.refundableAmount) > 0 && (
                        <div className="cp-small" style={{ color: "#d97706", marginTop: 4 }}>
                          Refund {inr(shownInvoice.refundableAmount)}
                        </div>
                      )}
                    </div>
                    <div className="cp-min cp-ellipsis">
                      <span className="cp-lbl">Created by</span>
                      {shownInvoice.createdByName || "—"}
                    </div>
                    <div className="cp-arrow">
                      {opening === shownInvoice.invoiceId ? (
                        <Loader2 size={16} className="cp-spin" />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Follow-ups ── */}
      {tab === "followups" && (
        <div className="cp-follow">
          <section className="cp-section">
            <div className="cp-section-title">Post-sale follow-ups</div>
            <TouchHistory
              account={account}
              arr={postSale}
              stageType="post-sale"
              onLog={(id, stageType, stepIndex) => setTouchModal({ id, stageType, stepIndex })}
            />
          </section>

          {preSale.length > 0 && (
            <section className="cp-section">
              <div className="cp-section-title">Pre-sale follow-ups (before becoming a client)</div>
              <TouchHistory account={account} arr={preSale} stageType="pre-sale" readOnly />
            </section>
          )}

          {remarks.length > 0 && (
            <section className="cp-section">
              <div className="cp-section-title">Call remarks ({remarks.length})</div>
              <div className="cp-remarks">
                {[...remarks]
                  .sort(
                    (remarkA, remarkB) => new Date(remarkB.loggedAt) - new Date(remarkA.loggedAt)
                  )
                  .map((remark) => (
                    <div key={remark._id} className="cp-remark">
                      <div className="cp-small cp-dim">
                        {fmtDate(remark.loggedAt)} · {remark.agent}
                        {remark.round
                          ? ` · Round ${remark.round}, touch ${remark.touchNumber}`
                          : ""}
                      </div>
                      <div className="cp-muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                        {remark.callStatus}
                        {remark.reason ? ` — ${remark.reason}` : ""}
                      </div>
                      {remark.nextCallDate && (
                        <div className="cp-small" style={{ color: "#2563eb", marginTop: 2 }}>
                          Next call: {fmtDate(remark.nextCallDate)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}
          {!isAdmin && (
            <div className="cp-small cp-dim">
              Older months' follow-ups are visible to admins only.
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {tab === "timeline" && (
        <div className="cp-timeline">
          {timeline.map((timelineEntry, index) => (
            <div key={index} className="cp-tl-item">
              <span
                className="cp-tl-dot"
                style={{ background: DOT[timelineEntry.type] || "var(--text-dim)" }}
              />
              <div
                className="cp-strong"
                style={{ fontSize: 12.5, cursor: timelineEntry.invoiceId ? "pointer" : "default" }}
                onClick={() =>
                  timelineEntry.invoiceId && openInvoice({ invoiceId: timelineEntry.invoiceId })
                }
              >
                {timelineTitle(timelineEntry)}
              </div>
              <div className="cp-small cp-dim">
                {fmtDate(timelineEntry.at)}
                {timelineEntry.by ? ` · ${timelineEntry.by}` : ""}
              </div>
              {timelineEntry.note && (
                <div className="cp-muted" style={{ fontSize: 12, marginTop: 3 }}>
                  {timelineEntry.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Details ── */}
      {tab === "details" && (
        <div className="cp-details">
          {[
            ["Doctor / person", client.doctorName],
            ["Clinic / institute", client.clinicName],
            ["Client ID", client.clientId],
            ["Mobile", client.contact],
            ["Email", client.email],
            ["Address", client.address],
            ["City", client.city],
            ["State", client.state],
            ["Enquiry / product", client.enquiry],
            ["Assigned agent", client.assignedEmployee?.name || client.assignedAgent],
            ["Contact by", client.contactBy],
            ["Client since", fmtDate(client.convertedAt || client.createdAt)],
            ["Remarks", client.remarks],
          ].map(([label, value]) => (
            <div key={label} className="cp-detail-row">
              <div className="cp-dim">{label}</div>
              <div className="cp-muted" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {value || "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {touchModal && (
        <FollowupModal
          targetId={touchModal.id}
          stageType={touchModal.stageType}
          stepIndex={touchModal.stepIndex}
          onClose={() => {
            setTouchModal(null);
            load();
          }}
        />
      )}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onDownload={handleDownload}
          onEdit={setEditInvoice}
          onDownloadCreditNotes={handleDownloadCreditNotes}
          cnBusy={cnBusy}
          onSettle={setSettleTarget}
          onReturn={setReturnTarget}
        />
      )}
      {editInvoice && (
        <UpdateInvoiceModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onRefresh={load}
        />
      )}
      {settleTarget && (
        <SettleInvoiceCreditModal
          invoice={settleTarget}
          onClose={() => setSettleTarget(null)}
          onDone={(result) => {
            setSettleTarget(null);
            load();
            if (result?.creditNoteNumber) offerCreditNotePdf(result);
          }}
        />
      )}
      {returnTarget && (
        <RecordInvoiceReturnModal
          invoice={returnTarget}
          onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
