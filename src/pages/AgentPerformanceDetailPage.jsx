/**
 * Screen "agent-performance-detail" (admins only): one agent's performance for a period, shown as
 * KPI tiles + charts, with the invoices / products / new clients tables below.
 *
 * Opened by clicking an agent on the Agent Performance page. The payload carries
 * { employeeId, agent, range, preset } — "agent" is the leaderboard row (rank, follow-ups),
 * used only for the header while the detail loads.
 *
 * Screen key: "agent-performance-detail" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 * API: leadsApi.getAgentPerformanceDetail
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  FileText,
  Package,
  Wallet,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Undo2,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Chart as ReactChart, Doughnut, Bar as BarChart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { useCrm } from "../context/CrmContext";
import { leadsApi } from "../backend/ApiService";
import { ROLE_LABELS } from "../constants/UserRoles";
import { CSS } from "../constants/AgentPerformanceCss";
import {
  inr,
  fmtDate,
  PRESETS,
  presetRange,
  colorFor,
  initials,
} from "../utils/AgentPerformanceHelpers";
import { Stat } from "../components/agent/Stat";
import { AgentDetail } from "../components/agent/AgentDetail";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

const C = {
  billed: "#f97316",
  received: "#3b82f6",
  due: "#ef4444",
  paid: "#16a34a",
  partial: "#f59e0b",
  unpaid: "#3b82f6",
  cancelled: "#94a3b8",
  violet: "#8b5cf6",
  green: "#22c55e",
};

/* Reads the current theme colours, and re-reads them when the theme switches
   (index.css toggles [data-theme] on <html>), so chart text stays readable. */
function readThemeColors() {
  const css = getComputedStyle(document.body);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    text: v("--text-muted", "#94a3b8"),
    dim: v("--text-dim", "#64748b"),
    grid: v("--border", "rgba(148,163,184,.25)"),
    card: v("--bg-surface", "#ffffff"),
  };
}

function useThemeColors() {
  const [colors, setColors] = useState(readThemeColors);
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readThemeColors()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

const shortInr = (amount) => {
  const n = Number(amount || 0);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/* Billed vs received per day (short periods) or per month (long periods). */
function buildTrend(invoices, range) {
  const from = new Date(range.from + "T00:00:00");
  const to = new Date(range.to + "T00:00:00");
  const days = Math.round((to - from) / 86400000) + 1;
  const byDay = days <= 45;

  const buckets = new Map();
  if (byDay) {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      buckets.set(dayKey(d), {
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        billed: 0,
        received: 0,
        count: 0,
      });
    }
  } else {
    for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d.setMonth(d.getMonth() + 1)) {
      buckets.set(monthKey(d), {
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        billed: 0,
        received: 0,
        count: 0,
      });
    }
  }

  invoices
    .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled" && inv.invoiceDate)
    .forEach((inv) => {
      const d = new Date(inv.invoiceDate);
      const bucket = buckets.get(byDay ? dayKey(d) : monthKey(d));
      if (!bucket) return;
      bucket.billed += Number(inv.total || 0);
      bucket.received += Number(inv.paid || 0);
      bucket.count += 1;
    });

  return { byDay, rows: [...buckets.values()] };
}

/* Top clients by billed value, from the invoice list. */
function topClients(invoices, limit = 8) {
  const map = new Map();
  invoices
    .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled")
    .forEach((inv) => {
      const name = inv.client || inv.company || "—";
      const row = map.get(name) || { name, billed: 0, received: 0, invoices: 0 };
      row.billed += Number(inv.total || 0);
      row.received += Number(inv.paid || 0);
      row.invoices += 1;
      map.set(name, row);
    });
  return [...map.values()].sort((a, b) => b.billed - a.billed).slice(0, limit);
}

function ChartCard({ title, sub, children, wide, empty }) {
  return (
    <div className={`apd-card${wide ? " wide" : ""}`}>
      <div className="apd-card-head">
        <div className="apd-card-title">{title}</div>
        {sub && <div className="apd-card-sub">{sub}</div>}
      </div>
      {empty ? <div className="apd-empty">{empty}</div> : children}
    </div>
  );
}

/* Doughnut with a figure in the hole. */
function Ring({ labels, values, colors, centerTop, centerBottom, theme, money }) {
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: theme.card,
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: theme.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${money ? inr(ctx.parsed) : ctx.parsed}`,
        },
      },
    },
  };
  return (
    <div className="apd-ring">
      <Doughnut data={data} options={options} />
      <div className="apd-ring-center">
        <div className="apd-ring-top">{centerTop}</div>
        <div className="apd-ring-bottom">{centerBottom}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function AgentPerformanceDetailPage({ payload, onNav }) {
  const { isAdmin } = useCrm();
  const theme = useThemeColors();

  const employeeId = payload?.employeeId;
  const listAgent = payload?.agent || null;
  const [preset, setPreset] = useState(payload?.preset || "this_month");
  const [range, setRange] = useState(() => payload?.range || presetRange("this_month"));
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const goBack = () => onNav?.("agent-performance", { preset, range });

  useEffect(() => {
    if (!employeeId || !isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    leadsApi
      .getAgentPerformanceDetail(employeeId, range)
      .then((res) => !cancelled && setDetail(res?.data ?? res))
      .catch((err) => !cancelled && setError(err.message || "Could not load details"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [employeeId, range, isAdmin, reloadKey]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const invoices = useMemo(() => detail?.invoices || [], [detail]);
  const trend = useMemo(() => buildTrend(invoices, range), [invoices, range]);
  const clients = useMemo(() => topClients(invoices), [invoices]);

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

  if (!employeeId) {
    return (
      <div className="fade-in ap" style={{ padding: 40, textAlign: "center" }}>
        <style>{CSS}</style>
        <div className="ap-dim" style={{ marginBottom: 14 }}>No agent selected.</div>
        <button className="btn btn-primary btn-sm" onClick={goBack}>
          <ArrowLeft size={13} /> Back to Agent Performance
        </button>
      </div>
    );
  }

  const agentName = detail?.agent?.name || listAgent?.name || "Agent";
  const agentRole = detail?.agent?.role ?? listAgent?.role;
  const s = detail?.summary || {};
  const collected = s.billed > 0 ? Math.round((s.received / s.billed) * 100) : 0;
  const periodText = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;
  const show = (value) => (loading && !detail ? "…" : value);

  /* ── chart configs ── */
  const axis = {
    ticks: { color: theme.dim, font: { size: 10 } },
    grid: { color: theme.grid },
    border: { display: false },
  };
  const moneyAxis = { ...axis, beginAtZero: true, ticks: { ...axis.ticks, callback: (v) => shortInr(v) } };
  const legend = {
    position: "top",
    align: "end",
    labels: { color: theme.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
  };

  const trendData = {
    labels: trend.rows.map((r) => r.label),
    datasets: [
      {
        type: "bar",
        label: "Billed",
        data: trend.rows.map((r) => r.billed),
        backgroundColor: "rgba(249,115,22,.75)",
        borderRadius: 5,
        maxBarThickness: 26,
        order: 2,
      },
      {
        type: "line",
        label: "Received",
        data: trend.rows.map((r) => r.received),
        borderColor: C.received,
        backgroundColor: "rgba(59,130,246,.12)",
        pointBackgroundColor: C.received,
        pointRadius: trend.rows.length > 20 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        order: 1,
      },
    ],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend,
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${inr(ctx.parsed.y)}`,
          afterBody: (items) => {
            const row = trend.rows[items[0]?.dataIndex];
            return row?.count ? `${row.count} invoice${row.count > 1 ? "s" : ""}` : "";
          },
        },
      },
    },
    scales: {
      x: { ...axis, grid: { display: false }, ticks: { ...axis.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: moneyAxis,
    },
  };

  const products = (detail?.products || []).slice(0, 8);
  const productData = {
    labels: products.map((p) => p.name),
    datasets: [
      {
        label: "Units sold",
        data: products.map((p) => p.units),
        backgroundColor: products.map((_, i) => `rgba(139,92,246,${0.9 - i * 0.08})`),
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };
  const productOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = products[ctx.dataIndex];
            return ` ${p.units} units · ${inr(p.amount)} · ${p.invoices} invoice${p.invoices === 1 ? "" : "s"}`;
          },
        },
      },
    },
    scales: {
      x: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, precision: 0 } },
      y: { ...axis, grid: { display: false }, ticks: { ...axis.ticks, color: theme.text, font: { size: 11 } } },
    },
  };

  const clientData = {
    labels: clients.map((c) => c.name),
    datasets: [
      {
        label: "Billed",
        data: clients.map((c) => c.billed),
        backgroundColor: "rgba(249,115,22,.8)",
        borderRadius: 5,
        maxBarThickness: 16,
      },
      {
        label: "Received",
        data: clients.map((c) => c.received),
        backgroundColor: "rgba(59,130,246,.8)",
        borderRadius: 5,
        maxBarThickness: 16,
      },
    ],
  };
  const clientOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend,
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${inr(ctx.parsed.x)}` } },
    },
    scales: {
      x: moneyAxis,
      y: { ...axis, grid: { display: false }, ticks: { ...axis.ticks, color: theme.text, font: { size: 11 } } },
    },
  };

  const statusValues = [s.paidInvoices || 0, s.partialInvoices || 0, s.unpaidInvoices || 0, s.cancelledInvoices || 0];
  const statusTotal = statusValues.reduce((a, b) => a + b, 0);
  const due = Math.max(0, Number(s.due || 0));
  const received = Math.max(0, Number(s.received || 0));
  const converted = (detail?.newClients || []).filter((c) => c.clientOrigin !== "direct").length;
  const direct = (detail?.newClients || []).length - converted;

  return (
    <div className="fade-in ap">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="apd-head">
        <button className="apd-back" onClick={goBack} title="Back to Agent Performance">
          <ArrowLeft size={16} />
        </button>
        <span className="apd-av" style={{ background: colorFor(agentName) }}>
          {initials(agentName)}
        </span>
        <div className="ap-min" style={{ flex: 1 }}>
          <div className="apd-crumb">
            <span className="ap-clickable" onClick={goBack}>Agent Performance</span> / Agent
          </div>
          <h2 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {agentName}
            {listAgent?.rank && listAgent?.amounts?.paidInvoicesValue > 0 && listAgent.rank <= 3 && (
              <span style={{ fontSize: 20 }}>{["🥇", "🥈", "🥉"][listAgent.rank - 1]}</span>
            )}
            {listAgent && listAgent.isActive === false && <span className="ap-inactive">Inactive</span>}
          </h2>
          <p className="page-sub" style={{ margin: "2px 0 0" }}>
            {ROLE_LABELS[agentRole] ?? "—"}
            {listAgent?.rank ? ` · Rank #${listAgent.rank}` : ""}
            {listAgent?.activity?.followups ? ` · ${listAgent.activity.followups} follow-ups` : ""}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setReloadKey((k) => k + 1)} title="Refresh">
          <RefreshCw size={13} className={loading ? "ap-spin" : ""} />
        </button>
      </div>

      {/* ── Period ── */}
      <div className="ap-period">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => choosePreset(p.key)}
            className={`ap-chip${preset === p.key ? " on" : ""}`}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="ap-row-wrap" style={{ alignItems: "center" }}>
            <input
              type="date"
              className="input ap-date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
            />
            <span className="ap-dim">to</span>
            <input
              type="date"
              className="input ap-date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
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
          <button onClick={() => setReloadKey((k) => k + 1)} className="ap-link">
            Retry
          </button>
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div className="ap-stats">
        <Stat icon={Users} label="New clients" value={show(s.clientsWon ?? 0)} sub={show(`${converted} converted · ${direct} direct`)} accent="var(--green)" />
        <Stat icon={FileText} label="Invoices" value={show(s.invoices ?? 0)} sub={show(`${s.paidInvoices ?? 0} fully paid`)} />
        <Stat icon={Package} label="Products sold" value={show(`${s.unitsSold ?? 0} units`)} sub={show(`${(detail?.products || []).length} products`)} />
        <Stat icon={Wallet} label="Billed" value={show(inr(s.billed))} accent={C.billed} />
        <Stat icon={IndianRupee} label="Received" value={show(inr(s.received))} sub={show(s.billed ? `${collected}% collected` : "")} accent={C.received} />
        <Stat icon={CheckCircle2} label="Paid invoices value" value={show(inr(s.paidInvoicesValue))} sub="incentive basis" accent={C.violet} highlight />
        <Stat icon={AlertCircle} label="Due" value={show(inr(s.due))} accent={s.due > 0 ? C.due : undefined} />
        {s.returned > 0 && <Stat icon={Undo2} label="Returns" value={inr(s.returned)} accent="#d97706" />}
      </div>

      {/* ── Charts ── */}
      {loading && !detail ? (
        <div className="apd-loading">
          <Loader2 size={18} className="ap-spin" /> Loading charts…
        </div>
      ) : detail ? (
        <div className="apd-grid">
          <ChartCard
            wide
            title="Billed vs received"
            sub={`${trend.byDay ? "Per day" : "Per month"} · by invoice date · draft & cancelled excluded`}
            empty={s.billed > 0 ? null : "No invoices in this period"}
          >
            <div className="apd-chart tall">
              <ReactChart type="bar" data={trendData} options={trendOptions} />
            </div>
          </ChartCard>

          <ChartCard
            title="Invoice status"
            sub={`${statusTotal} invoice${statusTotal === 1 ? "" : "s"}`}
            empty={statusTotal ? null : "No invoices in this period"}
          >
            <Ring
              theme={theme}
              labels={["Paid", "Partial", "Unpaid", "Cancelled"]}
              values={statusValues}
              colors={[C.paid, C.partial, C.unpaid, C.cancelled]}
              centerTop={s.paidInvoices ?? 0}
              centerBottom="fully paid"
            />
          </ChartCard>

          <ChartCard
            title="Collection"
            sub={`${inr(s.billed)} billed`}
            empty={received + due > 0 ? null : "Nothing billed in this period"}
          >
            <Ring
              theme={theme}
              money
              labels={["Received", "Due"]}
              values={[received, due]}
              colors={[C.received, C.due]}
              centerTop={`${collected}%`}
              centerBottom="collected"
            />
          </ChartCard>

          <ChartCard
            title="New clients"
            sub={`${(detail.newClients || []).length} in this period`}
            empty={(detail.newClients || []).length ? null : "No new clients in this period"}
          >
            <Ring
              theme={theme}
              labels={["Converted from lead", "Direct"]}
              values={[converted, direct]}
              colors={[C.green, "#f97316"]}
              centerTop={(detail.newClients || []).length}
              centerBottom="new clients"
            />
          </ChartCard>

          <ChartCard
            title="Products sold"
            sub={products.length < (detail.products || []).length ? `Top ${products.length} by units` : "Units sold (returns excluded)"}
            empty={products.length ? null : "No products sold in this period"}
          >
            <div className="apd-chart" style={{ height: Math.max(180, products.length * 34 + 40) }}>
              <BarChart data={productData} options={productOptions} />
            </div>
          </ChartCard>

          <ChartCard
            title="Top clients"
            sub="By billed value"
            empty={clients.length ? null : "No billed clients in this period"}
          >
            <div className="apd-chart" style={{ height: Math.max(180, clients.length * 40 + 50) }}>
              <BarChart data={clientData} options={clientOptions} />
            </div>
          </ChartCard>
        </div>
      ) : null}

      {/* ── Tables ── */}
      {detail && (
        <div className="ap-board apd-tables">
          <div className="ap-board-head">
            <div className="ap-board-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={14} /> Details
              <span>· invoices, products and new clients · CSV / PDF export</span>
            </div>
          </div>
          <AgentDetail employeeId={employeeId} range={range} onNav={onNav} preloaded={detail} hideSummary />
        </div>
      )}
    </div>
  );
}
