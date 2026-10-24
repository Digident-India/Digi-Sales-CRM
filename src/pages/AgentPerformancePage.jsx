/**
 * Screen "agent-performance" (admins only): per-agent clients won, products sold, invoices and
 * money collected for a period.
 *
 * Admin / Super Admin only
 * • Pick a period (This month / Last month / Quarter / Financial year / Custom)
 * • Per agent: new clients, products sold, invoices (paid / partial / unpaid),
 *   billed, received, value of fully paid invoices, due, follow-ups
 * • No incentive % here — the admin decides the incentive from
 *   "Paid invoices value" / "Received"
 * • An invoice only counts as paid when its payment is fully recorded.
 *   Invoices marked "Paid" with no payment entered are flagged separately.
 * • Click an agent → opens their own page (charts + invoices, products, new clients)
 * • PDF + CSV export for the leaderboard and for each agent's invoices
 * • No horizontal scrolling — rows turn into cards on smaller screens
 * The backend also checks the role; agents never receive this data.
 *
 * Screen key: "agent-performance" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 * API: leadsApi.getAgentPerformance
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Download,
  FileDown,
  Users,
  FileText,
  Wallet,
  Package,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Info,
  IndianRupee,
} from "lucide-react";
import { useCrm } from "../context/CrmContext";
import { leadsApi } from "../backend/ApiService";
import { ROLE_LABELS } from "../constants/UserRoles";
import { showError } from "../components/ui/Alert";
import { downloadReportPdf, pdfMoney, pdfNum, pdfDate } from "../utils/ReportPdf";
import { CSS } from "../constants/AgentPerformanceCss";
import {
  inr,
  fmtDate,
  PRESETS,
  presetRange,
  colorFor,
  initials,
  downloadCsv,
  LEADER_HEAD,
  leaderRow,
  csvMoney,
} from "../utils/AgentPerformanceHelpers";
import { Stat } from "../components/agent/Stat";
import { Bar } from "../components/agent/Bar";

/* ════════════════════════════════════════════════════════════════════════ */
export default function AgentPerformancePage({ onNav, initial }) {
  const { isAdmin } = useCrm();
  // `initial` = { preset, range } when coming back from an agent's page
  const [preset, setPreset] = useState(initial?.preset || "this_month");
  const [range, setRange] = useState(() => initial?.range || presetRange("this_month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await leadsApi.getAgentPerformance(range);
      setData(res?.data ?? res);
    } catch (error) {
      setError(error.message || "Could not load the report");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const choosePreset = (presetKey) => {
    setPreset(presetKey);
    if (presetKey !== "custom") setRange(presetRange(presetKey));
  };

  const agents = useMemo(() => {
    const list = data?.agents || [];
    // default: active agents + anyone who did some work in this period
    return showAll
      ? list
      : list.filter(
          (agent) =>
            agent.isActive || agent.invoices.total || agent.clients.won || agent.activity.followups
        );
  }, [data, showAll]);

  const maxReceived = Math.max(1, ...agents.map((agent) => agent.amounts.received));
  const periodText = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `agent-performance_${range.from}_to_${range.to}.csv`,
      LEADER_HEAD,
      (data.agents || []).map((agent) => leaderRow(agent, csvMoney))
    );
  };

  const exportPdf = async () => {
    if (!data || pdfBusy) return;
    setPdfBusy(true);
    try {
      const totals = data.totals || {};
      await downloadReportPdf({
        title: "Agent Performance Report",
        subtitle: `${pdfDate(range.from)} - ${pdfDate(range.to)}`,
        summary: [
          ["New clients", totals.clientsWon ?? 0],
          ["Invoices", `${totals.invoices ?? 0} (${totals.paidInvoices ?? 0} paid)`],
          ["Units sold", totals.unitsSold ?? 0],
          ["Billed", pdfMoney(totals.billed)],
          ["Received", pdfMoney(totals.received)],
          ["Paid invoices value", pdfMoney(totals.paidInvoicesValue)],
          ["Due", pdfMoney(totals.due)],
          ...(totals.paidPaymentMissing
            ? [
                [
                  "Marked paid, payment missing",
                  `${totals.paidPaymentMissing} (${pdfMoney(totals.paymentMissing)})`,
                ],
              ]
            : []),
        ],
        tables: [
          {
            title: "Agents",
            head: LEADER_HEAD,
            body: agents.map((agent) => leaderRow(agent, pdfNum)),
            align: Object.fromEntries(
              [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((columnIndex) => [
                columnIndex,
                { halign: "right" },
              ])
            ),
          },
        ],
        filename: `agent-performance_${range.from}_to_${range.to}.pdf`,
      });
    } catch (error) {
      showError("PDF failed: " + error.message);
    } finally {
      setPdfBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-white)" }}>
          Access restricted
        </div>
        <div style={{ fontSize: 12, marginTop: 6 }}>
          Only Admin / Super Admin can view this page.
        </div>
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="fade-in ap">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <span
            className="stage-badge"
            style={{
              background: "rgba(167,139,250,.12)",
              color: "#8b5cf6",
              border: "1px solid rgba(167,139,250,.35)",
            }}
          >
            Admin only
          </span>
          <h2 className="page-title">Agent Performance</h2>
          <p className="page-sub">
            Clients created, products sold, invoices paid and money collected by each agent · use
            “Paid invoices value” to decide incentives
          </p>
        </div>
        <div className="ap-row-wrap">
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data}>
            <Download size={13} /> CSV
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={exportPdf}
            disabled={!data || pdfBusy}
          >
            {pdfBusy ? <Loader2 size={13} className="ap-spin" /> : <FileDown size={13} />} PDF
          </button>
        </div>
      </div>

      {/* ── Period ── */}
      <div className="ap-period">
        {PRESETS.map((currentPreset) => (
          <button
            key={currentPreset.key}
            onClick={() => choosePreset(currentPreset.key)}
            className={`ap-chip${preset === currentPreset.key ? " on" : ""}`}
          >
            {currentPreset.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="ap-row-wrap" style={{ alignItems: "center" }}>
            <input
              type="date"
              className="input ap-date"
              value={range.from}
              max={range.to}
              onChange={(event) =>
                event.target.value &&
                setRange((prevRange) => ({ ...prevRange, from: event.target.value }))
              }
            />
            <span className="ap-dim">to</span>
            <input
              type="date"
              className="input ap-date"
              value={range.to}
              min={range.from}
              onChange={(event) =>
                event.target.value &&
                setRange((prevRange) => ({ ...prevRange, to: event.target.value }))
              }
            />
          </div>
        )}
        <span className="ap-dim" style={{ marginLeft: "auto" }}>
          {periodText}
        </span>
      </div>

      {error && (
        <div className="ap-error">
          <AlertCircle size={14} /> {error}
          <button onClick={load} className="ap-link">
            Retry
          </button>
        </div>
      )}

      {/* ── Totals ── */}
      <div className="ap-stats">
        <Stat
          icon={Users}
          label="New clients"
          value={loading ? "…" : (totals?.clientsWon ?? 0)}
          sub="in this period"
          accent="var(--green)"
        />
        <Stat
          icon={FileText}
          label="Invoices"
          value={loading ? "…" : (totals?.invoices ?? 0)}
          sub={loading ? "" : `${totals?.paidInvoices ?? 0} fully paid`}
        />
        <Stat
          icon={Package}
          label="Products sold"
          value={loading ? "…" : `${totals?.unitsSold ?? 0} units`}
        />
        <Stat icon={Wallet} label="Billed" value={loading ? "…" : inr(totals?.billed)} />
        <Stat
          icon={IndianRupee}
          label="Received"
          value={loading ? "…" : inr(totals?.received)}
          sub={
            !loading && totals?.billed
              ? `${Math.round((totals.received / totals.billed) * 100)}% collected`
              : ""
          }
          accent="#2563eb"
        />
        <Stat
          icon={CheckCircle2}
          label="Paid invoices value"
          value={loading ? "…" : inr(totals?.paidInvoicesValue)}
          sub="fully paid invoices — incentive basis"
          accent="#8b5cf6"
          highlight
        />
        <Stat
          icon={AlertCircle}
          label="Due"
          value={loading ? "…" : inr(totals?.due)}
          accent={totals?.due > 0 ? "#dc2626" : undefined}
        />
      </div>

      {!loading && totals?.paidPaymentMissing > 0 && (
        <div className="ap-warn">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            <b>
              {totals.paidPaymentMissing} invoice{totals.paidPaymentMissing > 1 ? "s are" : " is"}{" "}
              marked “Paid” but the payment ({inr(totals.paymentMissing)}) was never entered.
            </b>{" "}
            They are not counted in “Paid invoices value”. Open the agent below to see which ones,
            then edit those invoices and enter the paid amount.
          </span>
        </div>
      )}

      {/* ── Leaderboard ── */}
      <div className="ap-board">
        <div className="ap-board-head">
          <div className="ap-board-title">
            Agents <span>· ranked by paid invoices value · click an agent for details</span>
          </div>
          <label className="ap-check">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />{" "}
            Show inactive / agents with no work
          </label>
        </div>

        <div className="ap-grid ap-grid-head">
          <div>#</div>
          <div>Agent</div>
          <div className="r">Clients</div>
          <div className="r">Invoices</div>
          <div className="r">Products sold</div>
          <div className="r">Billed</div>
          <div className="r">Received</div>
          <div className="r hl">Paid invoices value</div>
          <div className="r">Due</div>
        </div>

        {loading &&
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="ap-skel" />)}
        {!loading && agents.length === 0 && <div className="ap-empty">No data for this period</div>}

        {!loading &&
          agents.map((agent) => {
            const openAgent = () =>
              onNav?.("agent-performance-detail", {
                employeeId: agent.employeeId,
                agent,
                range,
                preset,
              });
            const top = agent.products.top?.[0];
            const medal = agent.rank <= 3 && agent.amounts.paidInvoicesValue > 0;
            return (
              <div key={agent.employeeId} className="ap-agent">
                <div
                  className="ap-grid ap-item"
                  role="button"
                  tabIndex={0}
                  title="Open agent details"
                  onClick={openAgent}
                  onKeyDown={(event) => event.key === "Enter" && openAgent()}
                >
                  <div className="ap-rank">
                    {medal ? ["🥇", "🥈", "🥉"][agent.rank - 1] : agent.rank}
                  </div>
                  <div className="ap-who">
                    <ChevronRight size={14} />
                    <span className="ap-av" style={{ background: colorFor(agent.name) }}>
                      {initials(agent.name)}
                    </span>
                    <div className="ap-min">
                      <div className="ap-name">
                        {agent.name}
                        {!agent.isActive && <span className="ap-inactive">Inactive</span>}
                      </div>
                      <div className="ap-sub">{ROLE_LABELS[agent.role] ?? "—"}</div>
                    </div>
                  </div>
                  <div className="r">
                    <span className="ap-lbl">Clients</span>
                    <div
                      className="ap-big"
                      style={{ color: agent.clients.won ? "var(--green)" : "var(--text-dim)" }}
                    >
                      {agent.clients.won} new
                    </div>
                    <div className="ap-sub">
                      {agent.clients.current} total
                      {agent.clients.won > 0
                        ? ` · ${agent.clients.converted} converted, ${agent.clients.direct} direct`
                        : ""}
                    </div>
                  </div>
                  <div className="r">
                    <span className="ap-lbl">Invoices</span>
                    <div className="ap-big">{agent.invoices.billable}</div>
                    {agent.invoices.billable > 0 && (
                      <div className="ap-sub">
                        <span style={{ color: "#16a34a" }}>{agent.invoices.paid} paid</span> ·{" "}
                        <span style={{ color: "#d97706" }}>{agent.invoices.partial} partial</span> ·{" "}
                        <span style={{ color: "#2563eb" }}>{agent.invoices.unpaid} unpaid</span>
                      </div>
                    )}
                    {agent.invoices.paidPaymentMissing > 0 && (
                      <div className="ap-sub ap-amber">
                        ⚠ {agent.invoices.paidPaymentMissing} paid, no payment
                      </div>
                    )}
                  </div>
                  <div className="r ap-min">
                    <span className="ap-lbl">Products sold</span>
                    <div className="ap-big">{agent.products.unitsSold} units</div>
                    {top && (
                      <div
                        className="ap-sub ap-ellipsis"
                        title={agent.products.top
                          .map((product) => `${product.name} ×${product.units}`)
                          .join(", ")}
                      >
                        Top: {top.name} ×{top.units}
                      </div>
                    )}
                  </div>
                  <div className="r">
                    <span className="ap-lbl">Billed</span>
                    {inr(agent.amounts.billed)}
                  </div>
                  <div className="r">
                    <span className="ap-lbl">Received</span>
                    <div className="ap-big" style={{ color: "#2563eb" }}>
                      {inr(agent.amounts.received)}
                    </div>
                    <Bar pct={(agent.amounts.received / maxReceived) * 100} color="#3b82f6" />
                    {agent.amounts.billed > 0 && (
                      <div className="ap-sub">{agent.collectionRate}% collected</div>
                    )}
                  </div>
                  <div className="r">
                    <span className="ap-lbl">Paid invoices value</span>
                    <div
                      className="ap-big"
                      style={{
                        fontSize: 15,
                        color: agent.amounts.paidInvoicesValue > 0 ? "#8b5cf6" : "var(--text-dim)",
                      }}
                    >
                      {inr(agent.amounts.paidInvoicesValue)}
                    </div>
                    {agent.amounts.returned > 0 && (
                      <div
                        className="ap-sub ap-amber"
                        title="Returns / refunds — keep in mind when deciding the incentive"
                      >
                        ↩ {inr(agent.amounts.returned)} returned
                      </div>
                    )}
                  </div>
                  <div
                    className="r"
                    style={{ color: agent.amounts.due > 0 ? "#dc2626" : "var(--text-dim)" }}
                  >
                    <span className="ap-lbl">Due</span>
                    {agent.amounts.due > 0 ? inr(agent.amounts.due) : "—"}
                    {agent.activity.followups > 0 && (
                      <div className="ap-sub">{agent.activity.followups} follow-ups</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        <div className="ap-note">
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            An invoice belongs to the agent who created it, and is counted by its invoice date.
            Draft and cancelled invoices are not counted as sales. “New clients” = clients created
            or converted in this period that are assigned to the agent now. “Paid invoices value” =
            total of invoices that are fully paid (payment recorded) — use it to decide the
            incentive. Units sold exclude returned items.
          </span>
        </div>
      </div>
    </div>
  );
}
