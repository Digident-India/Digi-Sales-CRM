/**
 * Drill-down for one agent on the Agent Performance page: clients won, invoices, products and
 * payments in the period, with CSV / PDF export.
 *
 * Pass `preloaded` (the detail response) to skip the fetch, and `hideSummary` to drop the
 * summary strip when the page already shows those figures.
 *
 * Used by: pages/AgentPerformanceDetailPage.jsx
 * API: leadsApi.getAgentPerformanceDetail
 */

import { useEffect, useState } from "react";
import { Download, FileDown, AlertTriangle, Loader2 } from "lucide-react";
import { leadsApi } from "../../backend/ApiService";
import { ROLE_LABELS } from "../../constants/UserRoles";
import { showError } from "../ui/Alert";
import { downloadReportPdf, pdfMoney, pdfNum, pdfDate } from "../../utils/ReportPdf";
import {
  inr,
  fmtDate,
  downloadCsv,
  csvMoney,
  inr2,
  slug,
  STATUS_META,
  SOURCE_LABEL,
  INV_HEAD,
  invRow,
} from "../../utils/AgentPerformanceHelpers";

/* ════════════════════════════════════════════════════════════════════════
   ONE AGENT — invoices · products · new clients
═════════════════════════════════════════════════════════════════════════ */
export function AgentDetail({ employeeId, range, onNav, preloaded, hideSummary }) {
  const [detail, setDetail] = useState(preloaded || null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("invoices");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (preloaded) {
      setDetail(preloaded);
      setErr("");
      return undefined;
    }
    let cancelled = false;
    setDetail(null);
    setErr("");
    leadsApi
      .getAgentPerformanceDetail(employeeId, range)
      .then((res) => !cancelled && setDetail(res?.data ?? res))
      .catch((error) => !cancelled && setErr(error.message || "Could not load details"));
    return () => {
      cancelled = true;
    };
  }, [employeeId, range, preloaded]);

  if (err)
    return (
      <div className="ap-detail" style={{ color: "#dc2626", fontSize: 12 }}>
        {err}
      </div>
    );
  if (!detail)
    return (
      <div className="ap-detail ap-dim" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Loader2 size={14} className="ap-spin" /> Loading…
      </div>
    );

  const summary = detail.summary;
  const shown = detail.invoices.filter((invoice) =>
    statusFilter === "all"
      ? true
      : statusFilter === "paid"
        ? invoice.fullyPaid
        : statusFilter === "unpaid"
          ? ["issued", "partially_paid"].includes(invoice.status)
          : statusFilter === "missing"
            ? invoice.paymentMissing > 0
            : invoice.status === statusFilter
  );

  const openProfile = (leadId) => leadId && onNav?.("client-profile", String(leadId));
  const base = `${slug(detail.agent.name)}_invoices_${detail.range.from}_to_${detail.range.to}`;

  const exportCsv = () =>
    downloadCsv(
      `${base}.csv`,
      INV_HEAD,
      detail.invoices.map((invoice) => invRow(invoice, csvMoney, fmtDate))
    );

  const exportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf({
        title: `Invoices — ${detail.agent.name}`,
        subtitle: `${ROLE_LABELS[detail.agent.role] ?? ""} · ${pdfDate(detail.range.from)} - ${pdfDate(detail.range.to)}`,
        summary: [
          ["New clients", summary.clientsWon],
          ["Invoices", `${summary.invoices} · ${summary.paidInvoices} paid`],
          ["Partial / unpaid", `${summary.partialInvoices} / ${summary.unpaidInvoices}`],
          ["Units sold", summary.unitsSold],
          ["Billed", pdfMoney(summary.billed)],
          ["Received", pdfMoney(summary.received)],
          ["Paid invoices value", pdfMoney(summary.paidInvoicesValue)],
          ["Due", pdfMoney(summary.due)],
          ["Returns", pdfMoney(summary.returned)],
          ...(summary.paidPaymentMissingInvoices
            ? [
                [
                  "Marked paid, payment missing",
                  `${summary.paidPaymentMissingInvoices} (${pdfMoney(summary.paymentMissing)})`,
                ],
              ]
            : []),
        ],
        tables: [
          {
            head: INV_HEAD,
            body: detail.invoices.map((invoice) => invRow(invoice, pdfNum, pdfDate)),
            foot: [
              [
                { content: "Total (excluding draft / cancelled)", colSpan: 8 },
                summary.unitsSold,
                pdfNum(summary.billed),
                pdfNum(summary.received),
                pdfNum(summary.due),
                pdfNum(summary.returned),
              ],
            ],
            align: {
              8: { halign: "right" },
              9: { halign: "right" },
              10: { halign: "right" },
              11: { halign: "right" },
              12: { halign: "right" },
            },
          },
        ],
        filename: `${base}.pdf`,
      });
    } catch (error) {
      showError("PDF failed: " + error.message);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="ap-detail">
      {/* summary strip */}
      {!hideSummary && (
      <div className="ap-strip">
        <span>
          <b style={{ color: "var(--green)" }}>{summary.clientsWon}</b> new clients
        </span>
        <span>
          <b>{summary.invoices}</b> invoices —{" "}
          <span style={{ color: "#16a34a" }}>{summary.paidInvoices} paid</span>,{" "}
          <span style={{ color: "#d97706" }}>{summary.partialInvoices} partial</span>,{" "}
          <span style={{ color: "#2563eb" }}>{summary.unpaidInvoices} unpaid</span>
          {summary.cancelledInvoices ? `, ${summary.cancelledInvoices} cancelled` : ""}
        </span>
        <span>
          <b>{summary.unitsSold}</b> units sold
        </span>
        <span>
          Received <b style={{ color: "#2563eb" }}>{inr2(summary.received)}</b>
        </span>
        <span>
          Paid invoices value <b className="ap-violet">{inr2(summary.paidInvoicesValue)}</b>
        </span>
        {summary.due > 0 && (
          <span>
            Due <b style={{ color: "#dc2626" }}>{inr2(summary.due)}</b>
          </span>
        )}
        {summary.returned > 0 && (
          <span>
            Returns <b className="ap-amber">{inr2(summary.returned)}</b>
          </span>
        )}
      </div>
      )}
      {summary.paidPaymentMissingInvoices > 0 && (
        <div className="ap-warn" style={{ marginBottom: 10 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            {summary.paidPaymentMissingInvoices} invoice(s) marked “Paid” without the payment
            entered ({inr2(summary.paymentMissing)}). Use the “Payment missing” filter below.
          </span>
        </div>
      )}

      <div className="ap-row-wrap" style={{ marginBottom: 12, alignItems: "center" }}>
        {[
          ["invoices", `Invoices (${detail.invoices.length})`],
          ["products", `Products (${detail.products.length})`],
          ["clients", `New clients (${detail.newClients.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`ap-tab${tab === key ? " on" : ""}`}
          >
            {label}
          </button>
        ))}
        {tab === "invoices" && detail.invoices.length > 0 && (
          <div className="ap-row-wrap" style={{ marginLeft: "auto" }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}>
              <Download size={12} /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={exportPdf} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 size={12} className="ap-spin" /> : <FileDown size={12} />} PDF
            </button>
          </div>
        )}
      </div>

      {tab === "invoices" &&
        (detail.invoices.length === 0 ? (
          <div className="ap-dim" style={{ padding: 10 }}>
            This agent created no invoices in this period.
          </div>
        ) : (
          <>
            <div className="ap-row-wrap" style={{ marginBottom: 10 }}>
              {[
                ["all", "All"],
                ["paid", "Paid"],
                ["unpaid", "Unpaid / partial"],
                ["cancelled", "Cancelled"],
                ...(summary.paidPaymentMissingInvoices ? [["missing", "Payment missing"]] : []),
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`ap-pill${statusFilter === key ? " on" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ap-table">
              <div className="ap-inv ap-inv-head">
                <div>Invoice</div>
                <div>Date</div>
                <div>Client</div>
                <div>Products</div>
                <div>Status</div>
                <div className="r">Total</div>
                <div className="r">Paid</div>
                <div className="r">Due</div>
              </div>
              {shown.length === 0 && <div className="ap-empty">No invoices match this filter</div>}
              {shown.map((invoice) => {
                const statusMetaConfig = STATUS_META[invoice.status] || STATUS_META.draft;
                return (
                  <div
                    key={invoice.invoiceId}
                    className="ap-inv ap-inv-row"
                    style={{ opacity: invoice.status === "cancelled" ? 0.55 : 1 }}
                  >
                    <div>
                      <div className="ap-invno">{invoice.invoiceNumber}</div>
                      <div className="ap-sub">{SOURCE_LABEL[invoice.source] || invoice.source}</div>
                    </div>
                    <div>
                      <span className="ap-lbl">Date</span>
                      {fmtDate(invoice.invoiceDate)}
                    </div>
                    <div className="ap-min">
                      <span className="ap-lbl">Client</span>
                      <div
                        className={`ap-strong ap-ellipsis${invoice.leadId && onNav ? " ap-clickable" : ""}`}
                        onClick={() => openProfile(invoice.leadId)}
                        title={invoice.leadId ? "Open client profile" : ""}
                      >
                        {invoice.client || "—"}
                      </div>
                      <div className="ap-sub ap-ellipsis">
                        {[invoice.company !== invoice.client && invoice.company, invoice.clientId]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="ap-min">
                      <span className="ap-lbl">Products</span>
                      <div className="ap-ellipsis" title={invoice.items}>
                        {invoice.items || "—"}
                      </div>
                      <div className="ap-sub">{invoice.units} units</div>
                    </div>
                    <div>
                      <span className="ap-lbl">Status</span>
                      <span
                        style={{ fontSize: 11, fontWeight: 800, color: statusMetaConfig.color }}
                      >
                        {statusMetaConfig.label}
                      </span>
                      {invoice.paymentMissing > 0 && (
                        <div className="ap-sub ap-amber">⚠ payment not entered</div>
                      )}
                      {invoice.returned > 0 && (
                        <div className="ap-sub ap-amber">↩ {inr(invoice.returned)} returned</div>
                      )}
                    </div>
                    <div className="r">
                      <span className="ap-lbl">Total</span>
                      {inr2(invoice.total)}
                    </div>
                    <div className="r" style={{ color: "#2563eb", fontWeight: 700 }}>
                      <span className="ap-lbl">Paid</span>
                      {inr2(invoice.paid)}
                    </div>
                    <div
                      className="r"
                      style={{ color: invoice.due > 0 ? "#dc2626" : "var(--text-dim)" }}
                    >
                      <span className="ap-lbl">Due</span>
                      {invoice.due > 0 ? inr2(invoice.due) : "—"}
                    </div>
                  </div>
                );
              })}
              <div className="ap-inv ap-inv-foot">
                <div className="ap-span5">Total (excluding draft / cancelled)</div>
                <div className="r">
                  <span className="ap-lbl">Total</span>
                  {inr2(summary.billed)}
                </div>
                <div className="r" style={{ color: "#2563eb" }}>
                  <span className="ap-lbl">Paid</span>
                  {inr2(summary.received)}
                </div>
                <div
                  className="r"
                  style={{ color: summary.due > 0 ? "#dc2626" : "var(--text-dim)" }}
                >
                  <span className="ap-lbl">Due</span>
                  {summary.due > 0 ? inr2(summary.due) : "—"}
                </div>
              </div>
            </div>
          </>
        ))}

      {tab === "products" &&
        (detail.products.length === 0 ? (
          <div className="ap-dim" style={{ padding: 10 }}>
            No products sold in this period.
          </div>
        ) : (
          <div className="ap-table">
            <div className="ap-prod ap-inv-head">
              <div>Product</div>
              <div className="r">Units sold</div>
              <div className="r">Invoices</div>
              <div className="r">Amount</div>
            </div>
            {detail.products.map((product) => (
              <div key={product.name} className="ap-prod ap-inv-row">
                <div className="ap-strong ap-min ap-ellipsis">{product.name}</div>
                <div className="r ap-strong">
                  <span className="ap-lbl">Units</span>
                  {product.units}
                </div>
                <div className="r">
                  <span className="ap-lbl">Invoices</span>
                  {product.invoices}
                </div>
                <div className="r">
                  <span className="ap-lbl">Amount</span>
                  {inr2(product.amount)}
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "clients" &&
        (detail.newClients.length === 0 ? (
          <div className="ap-dim" style={{ padding: 10 }}>
            No new clients in this period.
          </div>
        ) : (
          <div className="ap-clients">
            {detail.newClients.map((newClient) => (
              <div
                key={newClient._id}
                className={`ap-client${onNav ? " ap-clickable-card" : ""}`}
                onClick={() => openProfile(newClient._id)}
                title={onNav ? "Open client profile" : ""}
              >
                <div className="ap-strong">{newClient.doctorName || newClient.clinicName}</div>
                <div className="ap-sub">
                  {[newClient.clinicName, newClient.city, newClient.contact]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="ap-sub ap-row-wrap" style={{ marginTop: 6, gap: 8 }}>
                  {newClient.clientId && (
                    <span style={{ fontFamily: "monospace", color: "var(--green)" }}>
                      {newClient.clientId}
                    </span>
                  )}
                  <span
                    style={{
                      color: newClient.clientOrigin === "direct" ? "var(--orange)" : "var(--green)",
                    }}
                  >
                    {newClient.clientOrigin === "direct" ? "Direct" : "Converted"}
                  </span>
                  <span>{fmtDate(newClient.clientSince)}</span>
                </div>
                <div style={{ fontSize: 11, marginTop: 6, color: "var(--text-muted)" }}>
                  {newClient.invoiceCount} invoice{newClient.invoiceCount === 1 ? "" : "s"} ·{" "}
                  <span style={{ color: "#16a34a" }}>{newClient.paidInvoiceCount} paid</span> ·{" "}
                  {inr(newClient.billed)}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
