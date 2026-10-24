/**
 * Screen "credit-notes": all credit notes grouped by customer, with search, filters and actions.
 *
 * Same layout as Invoice Management: header + stats, search, and an
 * accordion per customer with a table of their credit notes.
 * Data: GET /credit-note/manage/get/:permission (server-side filters)
 *
 * Screen key: "credit-notes" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 * API: creditNoteService.cancel, creditNoteService.getAll
 */

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileMinus,
  X as CloseIcon,
} from "lucide-react";

import { creditNoteService } from "../backend/ApiService.js";
import { showError, showToast } from "../components/ui/Alert";
import {
  ApplyCreditNoteModal,
  RefundCreditNoteModal,
  CreditNoteDetailModal,
} from "../components/creditnote/CreditNoteActionModals.jsx";
import { fmtINR, unwrap, downloadCreditNotePdf } from "../utils/CreditNoteHelpers.js";
import { CreditNoteRow } from "../components/creditnote/CreditNoteRow.jsx";

const PAGE_SIZE = 50;

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "open,partially_used", label: "Usable" },
  { id: "open", label: "Open" },
  { id: "partially_used", label: "Partly used" },
  { id: "used", label: "Used" },
  { id: "cancelled", label: "Cancelled" },
];

const filterBox = { width: "auto", height: 44, borderRadius: 10, fontSize: 14, padding: "0 14px" };

/* ════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════ */
export default function CreditNotesPage() {
  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [pdfBusyId, setPdfBusyId] = useState(null);

  const [viewCn, setViewCn] = useState(null);
  const [applyCn, setApplyCn] = useState(null);
  const [refundCn, setRefundCn] = useState(null);

  useEffect(() => {
    const timerId = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timerId);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status, type, from, to]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = unwrap(
        await creditNoteService.getAll({
          search: debounced,
          status,
          type,
          startDate: from,
          endDate: to,
          page,
          limit: PAGE_SIZE,
        })
      );
      setNotes(data?.creditNotes || []);
      setSummary(data?.summary || null);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalItems(data?.pagination?.totalItems ?? (data?.creditNotes || []).length);
    } catch (err) {
      setFetchError(err.message || "Failed to load credit notes");
    } finally {
      setLoading(false);
    }
  }, [debounced, status, type, from, to, page]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  /* ── Actions ── */
  const handlePdf = async (creditNote) => {
    if (pdfBusyId) return;
    setPdfBusyId(creditNote.creditNoteId);
    try {
      await downloadCreditNotePdf(creditNote);
    } catch (error) {
      showError("PDF failed: " + error.message);
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleCancel = async (creditNote) => {
    const { isConfirmed, value } = await Swal.fire({
      title: `Cancel ${creditNote.creditNoteNumber}?`,
      text: "Only for a credit note raised by mistake. This can't be undone.",
      input: "text",
      inputPlaceholder: "Reason (optional)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "Keep it",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await creditNoteService.cancel(creditNote.creditNoteId, { reason: value || undefined });
      showToast("success", `${creditNote.creditNoteNumber} cancelled`);
      setViewCn(null);
      fetchNotes();
    } catch (error) {
      showError(error.message || "Couldn't cancel");
    }
  };

  const afterAction = (msg) => () => {
    setApplyCn(null);
    setRefundCn(null);
    setViewCn(null);
    showToast("success", msg);
    fetchNotes();
  };

  const filtersActive = !!(status || type || from || to || debounced);
  const clearFilters = () => {
    setStatus("");
    setType("");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const stats = [
    {
      label: "Total issued",
      value: summary?.totalIssued,
      color: "#ea580c",
      sub: `${summary?.totalCreditNotes ?? 0} credit notes`,
    },
    { label: "Used on invoices", value: summary?.totalApplied, color: "#16a34a" },
    { label: "Paid back", value: summary?.totalRefunded, color: "#ca8a04" },
    {
      label: "Open balance",
      value: summary?.totalUnapplied,
      color: "#4ade80",
      sub: "still usable",
    },
  ];

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <span className="stage-badge badge-orange">Billing</span>
          <h2 className="page-title">Credit Notes</h2>
          <p className="page-sub">
            Returns & cancellations settled as credit · view & download PDF
          </p>
        </div>
        <div
          className="inv-page-actions"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <button
            onClick={fetchNotes}
            title="Refresh"
            style={{
              background: "none",
              border: "1px solid var(--border-mid)",
              borderRadius: 10,
              padding: "9px 11px",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <RefreshCw size={15} className={loading ? "cn-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cn-stats">
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: stat.color,
              }}
            />
            <div
              style={{
                fontSize: 9,
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontWeight: 700,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: stat.color,
                fontFamily: "monospace",
                marginTop: 4,
              }}
            >
              {loading && !summary ? "…" : fmtINR(stat.value)}
            </div>
            {stat.sub && (
              <div style={{ fontSize: 10, color: "var(--text-ghost)", marginTop: 2 }}>
                {stat.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="cn-filters">
        <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 480 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-dim)",
              pointerEvents: "none",
            }}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search CN no., invoice, customer, phone…"
            className="input"
            style={{ ...filterBox, paddingLeft: 46, width: "100%" }}
          />
        </div>
        <select
          className="input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          style={{ ...filterBox, minWidth: 220 }}
        >
          {STATUS_TABS.map((statusTab) => (
            <option key={statusTab.label} value={statusTab.id}>
              {statusTab.id ? statusTab.label : "All statuses"}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={type}
          onChange={(event) => setType(event.target.value)}
          style={{ ...filterBox, minWidth: 160 }}
        >
          <option value="">All types</option>
          <option value="manual">Manual</option>
          <option value="return">Return</option>
          <option value="cancellation">Cancellation</option>
        </select>
        <div className="cn-date-range" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            style={{ ...filterBox, width: "auto" }}
            title="From"
          />
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>to</span>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            style={{ ...filterBox, width: "auto" }}
            title="To"
          />
        </div>
        {filtersActive && (
          <button
            onClick={clearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            <CloseIcon size={13} /> Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
          {loading ? "…" : `${totalItems} credit note${totalItems === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(239,68,68,.1)",
            border: "1px solid rgba(239,68,68,.3)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 18,
            fontSize: 12,
            color: "#f87171",
          }}
        >
          <AlertCircle size={15} /> {fetchError}
          <button
            onClick={fetchNotes}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
              fontSize: 11,
              textDecoration: "underline",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── List ── */}
      {loading && !notes.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 260,
            gap: 14,
          }}
        >
          <div
            className="cn-spin"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "#ea580c",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Loading credit notes…</span>
        </div>
      ) : notes.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
            borderRadius: 16,
            padding: "56px 20px",
            textAlign: "center",
          }}
        >
          <FileMinus size={40} style={{ color: "var(--text-ghost)", marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>
            {filtersActive ? "No credit notes match these filters" : "No credit notes yet"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              marginTop: 6,
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            {filtersActive
              ? "Try clearing the filters."
              : "They appear here when a return/cancellation is settled as store credit."}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            overflow: "hidden",
            opacity: loading ? 0.6 : 1,
            transition: "opacity .2s",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="cn-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--table-head-bg)" }}>
                  {[
                    "Credit Note",
                    "Customer",
                    "Reason & Items",
                    "Amount",
                    "Status & Usage",
                    "Actions",
                  ].map((label, index, allHeaders) => (
                    <th
                      key={label}
                      style={{
                        padding: "14px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        whiteSpace: "nowrap",
                        textAlign: index === allHeaders.length - 1 ? "right" : "left",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <CreditNoteRow
                    key={note.creditNoteId}
                    cn={note}
                    pdfBusy={pdfBusyId === note.creditNoteId}
                    onPdf={handlePdf}
                    onView={setViewCn}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((prevPage) => prevPage - 1)}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Page <strong style={{ color: "var(--text-muted)" }}>{page}</strong> of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prevPage) => prevPage + 1)}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {viewCn && !applyCn && !refundCn && (
        <CreditNoteDetailModal
          cn={viewCn}
          onClose={() => setViewCn(null)}
          onApply={setApplyCn}
          onRefund={setRefundCn}
          onCancel={handleCancel}
        />
      )}
      {applyCn && (
        <ApplyCreditNoteModal
          cn={applyCn}
          onClose={() => setApplyCn(null)}
          onDone={afterAction("Credit applied to invoice")}
        />
      )}
      {refundCn && (
        <RefundCreditNoteModal
          cn={refundCn}
          onClose={() => setRefundCn(null)}
          onDone={afterAction("Payout recorded")}
        />
      )}
    </div>
  );
}
