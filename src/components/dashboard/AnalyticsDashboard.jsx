/**
 * Lead analytics: KPIs, lead trend, pipeline, conversion gauge, follow-up heatmap, agent activity,
 * sources / cities and engagement (agents only see their own leads).
 *
 * Counts (inquiry / followup / client / flag / total / upcomingCount) come from the backend
 * dashboard payload when present. Breakdowns (trend, sources, cities, heatmap, agents) are worked
 * out from the `leads` array that CrmContext has loaded.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { useEffect, useMemo, useState } from "react";
import { useCrm } from "../../context/CrmContext";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

/* ───────────────────────── colours ─────────────────────────
   Canvas cannot read "var(--green)", so CSS variables are resolved to real colours at render
   time (that is why the old charts drew in black). Re-resolved when the theme changes. */

const FALLBACK = {
  "--orange": "#eb6834",
  "--yellow": "#eda100",
  "--green": "#1baf7a",
  "--text-white": "#0b0b0b",
  "--text-dim": "#52514e",
  "--text-ghost": "#8a8984",
  "--border": "rgba(120,120,120,.22)",
  "--bg-card": "#ffffff",
};

// Agent touch types: fixed order, never cycled (blue, orange, aqua).
const TOUCH_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];
const BLUE = "#2a78d6";

function readVar(name) {
  if (typeof window === "undefined") return FALLBACK[name];
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACK[name];
}

// Re-render charts when the app switches light/dark (class or data-theme on <html>/<body>).
function useThemeVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const observer = new MutationObserver(bump);
    [document.documentElement, document.body].forEach((el) =>
      observer.observe(el, { attributes: true, attributeFilter: ["class", "data-theme", "style"] })
    );
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", bump);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", bump);
    };
  }, []);
  return version;
}

function withAlpha(color, alpha) {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? color
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : color.slice(1);
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  return color;
}

/* ───────────────────────── data helpers ───────────────────────── */

function belongsToEmployee(lead, employeeId) {
  if (!employeeId) return false;
  if (lead.assignedEmployee && String(lead.assignedEmployee) === String(employeeId)) return true;
  const arrays = [lead.remarkFollowups, lead.preSaleFollowups, lead.postSaleFollowups];
  return arrays.some((array) =>
    (array || []).some((record) => String(record.employeeId) === String(employeeId))
  );
}

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short" });
const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function agentNameOf(record) {
  return record.agent || record.employeeName || record.agentName || record.contactBy || "(unknown)";
}

function topEntries(map, limit) {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= limit) return sorted.map(([label, value]) => ({ label, value }));
  const head = sorted.slice(0, limit - 1).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
  return [...head, { label: "Other", value: rest }];
}

const titleCase = (text) =>
  String(text || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";

/* ───────────────────────── small UI pieces ───────────────────────── */

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 16,
  minWidth: 0,
};

function Panel({ title, subtitle, right, children, style }) {
  return (
    <section style={{ ...card, ...style }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-white)" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-dim)" }}>{subtitle}</p>
          )}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Empty({ children = "No data yet" }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: 140,
        fontSize: 13,
        color: "var(--text-dim)",
        border: "1px dashed var(--border)",
        borderRadius: 10,
      }}
    >
      {children}
    </div>
  );
}

function KpiTile({ label, value, hint, accent }) {
  return (
    <div style={{ ...card, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 14,
          bottom: 14,
          width: 3,
          borderRadius: 3,
          background: accent,
        }}
      />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: "var(--text-ghost)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-white)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// Horizontal bar list in plain HTML: label, bar, value + share. Native title gives a hover tooltip.
function BarList({ items, color, total }) {
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => {
        const share = sum ? Math.round((item.value / sum) * 100) : 0;
        return (
          <div key={item.label} title={`${item.label}: ${item.value} (${share}%)`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 4,
                gap: 8,
              }}
            >
              <span
                style={{
                  color: "var(--text-white)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
              <span style={{ color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                <strong style={{ color: "var(--text-white)" }}>{item.value}</strong> · {share}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(item.value / max) * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: item.color || color,
                  transition: "width 600ms ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Meter({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div title={`${label}: ${value} of ${total}`}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--text-dim)",
          marginBottom: 5,
        }}
      >
        <span>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          <strong style={{ color: "var(--text-white)", fontSize: 14 }}>{pct}%</strong> ({value}/
          {total})
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: "var(--border)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 5,
            background: color,
            transition: "width 600ms ease",
          }}
        />
      </div>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: 999,
        border: "1px solid var(--border)",
        gap: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            border: 0,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 999,
            background: value === opt.value ? "var(--orange)" : "transparent",
            color: value === opt.value ? "#fff" : "var(--text-dim)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── main component ───────────────────────── */

export default function AnalyticsDashboard() {
  const { leads = [], invoices = [], counts = {}, dashboard = {}, user, isAdmin } = useCrm();
  const themeVersion = useThemeVersion();
  const [months, setMonths] = useState(6);

  const colors = useMemo(
    () => ({
      orange: readVar("--orange"),
      yellow: readVar("--yellow"),
      green: readVar("--green"),
      text: readVar("--text-white"),
      dim: readVar("--text-dim"),
      ghost: readVar("--text-ghost"),
      border: readVar("--border"),
      card: readVar("--bg-card"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion]
  );

  const scopedLeads = useMemo(() => {
    if (isAdmin) return leads;
    return leads.filter((lead) => belongsToEmployee(lead, user?._id));
  }, [leads, isAdmin, user?._id]);

  /* ── headline counts (backend payload first) ── */
  const byStage = (stage) => scopedLeads.filter((l) => l.stage === stage).length;
  const totalLeads = dashboard.total ?? (isAdmin ? leads.length : scopedLeads.length);
  const inquiryCount = dashboard.inquiry ?? (isAdmin ? counts.inquiry ?? 0 : byStage("inquiry"));
  const followupCount =
    dashboard.followup ?? (isAdmin ? counts.followup ?? 0 : byStage("followup"));
  const clientCount = dashboard.client ?? (isAdmin ? counts.client ?? 0 : byStage("client"));
  const flagCount = dashboard.flag ?? scopedLeads.filter((l) => l.flaggedAt || l.flagReason).length;
  const upcomingCount =
    dashboard.upcomingCount ??
    scopedLeads.filter((l) => l.nextFollowUpDate && new Date(l.nextFollowUpDate) >= new Date())
      .length;
  const conversionRate = totalLeads ? Math.round((clientCount / totalLeads) * 100) : 0;

  /* ── lead trend: created per month, and how many of those are clients now ── */
  const trend = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH.format(d), d, created: 0, won: 0 });
    }
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    scopedLeads.forEach((lead) => {
      if (!lead.createdAt) return;
      const c = new Date(lead.createdAt);
      const i = index[`${c.getFullYear()}-${c.getMonth()}`];
      if (i === undefined) return;
      buckets[i].created += 1;
      if (lead.stage === "client") buckets[i].won += 1;
    });
    return buckets;
  }, [scopedLeads, months]);
  const trendTotal = trend.reduce((s, b) => s + b.created, 0);

  /* ── follow-up heatmap: next 4 weeks, Monday-first ── */
  const heatmap = useMemo(() => {
    const today = startOfDay(new Date());
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset);
    const days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { d, count: 0, past: d < today, isToday: d.getTime() === today.getTime() };
    });
    let overdue = 0;
    scopedLeads.forEach((lead) => {
      if (!lead.nextFollowUpDate) return;
      const due = startOfDay(lead.nextFollowUpDate);
      if (due < today && lead.stage !== "client") overdue += 1;
      const i = Math.round((due - start) / 86400000);
      if (i >= 0 && i < 28) days[i].count += 1;
    });
    return { days, overdue, max: Math.max(1, ...days.map((x) => x.count)) };
  }, [scopedLeads]);

  /* ── agent activity: stacked by touch type ── */
  const agentRows = useMemo(() => {
    const kinds = [
      ["remarkFollowups", "Remarks"],
      ["preSaleFollowups", "Pre-sale"],
      ["postSaleFollowups", "Post-sale"],
    ];
    if (!isAdmin) {
      const mine = kinds.map(([key]) =>
        scopedLeads.reduce(
          (sum, lead) =>
            sum + (lead[key] || []).filter((r) => String(r.employeeId) === String(user?._id)).length,
          0
        )
      );
      return { labels: ["Me"], series: kinds.map(([, name], i) => ({ name, values: [mine[i]] })) };
    }
    const map = {};
    leads.forEach((lead) =>
      kinds.forEach(([key], k) =>
        (lead[key] || []).forEach((record) => {
          const name = agentNameOf(record);
          map[name] = map[name] || [0, 0, 0];
          map[name][k] += 1;
        })
      )
    );
    const rows = Object.entries(map)
      .sort((a, b) => b[1].reduce((s, v) => s + v, 0) - a[1].reduce((s, v) => s + v, 0))
      .slice(0, 8);
    return {
      labels: rows.map(([name]) => name),
      series: kinds.map(([, name], k) => ({ name, values: rows.map(([, v]) => v[k]) })),
    };
  }, [leads, scopedLeads, isAdmin, user?._id]);
  const agentTotal = agentRows.series.reduce((s, x) => s + x.values.reduce((a, b) => a + b, 0), 0);

  /* ── sources, cities, engagement ── */
  const { sources, cities, engagement } = useMemo(() => {
    const src = {};
    const city = {};
    let waSent = 0;
    let waReplied = 0;
    let touched = 0;
    let calls = 0;
    scopedLeads.forEach((lead) => {
      const s = titleCase(lead.source || "unknown");
      src[s] = (src[s] || 0) + 1;
      if (lead.city) {
        const c = titleCase(lead.city);
        city[c] = (city[c] || 0) + 1;
      }
      if (lead.whatsapp?.sent) waSent += 1;
      if (lead.whatsapp?.replied) waReplied += 1;
      if (lead.isTouched) touched += 1;
      calls += Number(lead.callCount) || 0;
    });
    return {
      sources: topEntries(src, 6),
      cities: topEntries(city, 6),
      engagement: { waSent, waReplied, touched, calls, total: scopedLeads.length },
    };
  }, [scopedLeads]);

  /* ───────── chart configs ───────── */

  const tooltipBase = {
    backgroundColor: colors.card,
    titleColor: colors.text,
    bodyColor: colors.dim,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxPadding: 4,
    usePointStyle: true,
  };

  const lineData = {
    labels: trend.map((b) => b.label),
    datasets: [
      {
        label: "New leads",
        data: trend.map((b) => b.created),
        borderColor: colors.orange,
        backgroundColor: withAlpha(colors.orange, 0.14),
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: colors.card,
        pointBackgroundColor: colors.orange,
      },
      {
        label: "Became clients",
        data: trend.map((b) => b.won),
        borderColor: colors.green,
        backgroundColor: withAlpha(colors.green, 0.12),
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: colors.card,
        pointBackgroundColor: colors.green,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 900, easing: "easeOutQuart" },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.dim } },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: withAlpha(colors.dim, 0.12) },
        ticks: { color: colors.dim, precision: 0 },
      },
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: { color: colors.dim, usePointStyle: true, pointStyle: "circle", boxWidth: 8 },
      },
      tooltip: tooltipBase,
    },
  };

  // Half-doughnut gauge.
  const gaugeData = {
    labels: ["Clients", "Not yet"],
    datasets: [
      {
        data: [clientCount, Math.max(0, totalLeads - clientCount)],
        backgroundColor: [colors.green, withAlpha(colors.dim, 0.16)],
        borderWidth: 0,
        borderRadius: 6,
        circumference: 180,
        rotation: 270,
        cutout: "78%",
      },
    ],
  };
  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipBase, callbacks: { label: (c) => ` ${c.label}: ${c.parsed}` } },
    },
  };

  const agentData = {
    labels: agentRows.labels,
    datasets: agentRows.series.map((s, i) => ({
      label: s.name,
      data: s.values,
      backgroundColor: TOUCH_COLORS[i],
      borderColor: colors.card,
      borderWidth: { right: 2 },
      borderSkipped: false,
      borderRadius: 4,
      barThickness: 16,
    })),
  };
  const agentOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeOutQuart" },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        border: { display: false },
        grid: { color: withAlpha(colors.dim, 0.12) },
        ticks: { color: colors.dim, precision: 0 },
      },
      y: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: { color: colors.text },
      },
    },
    plugins: {
      legend: {
        position: "top",
        align: "start",
        labels: { color: colors.dim, usePointStyle: true, pointStyle: "rectRounded", boxWidth: 10 },
      },
      tooltip: {
        ...tooltipBase,
        mode: "index",
        intersect: false,
        callbacks: {
          footer: (items) => `Total: ${items.reduce((s, i) => s + (i.parsed.x || 0), 0)}`,
        },
      },
    },
  };

  const pipeline = [
    { label: "Inquiry", value: inquiryCount, color: colors.orange },
    { label: "Follow-up", value: followupCount, color: colors.yellow },
    { label: "Client", value: clientCount, color: colors.green },
    { label: "Flagged", value: flagCount, color: "#e34948" },
  ];

  /* ───────── layout ───────── */

  const grid = (min) => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
    gap: 14,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* scope + period */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              padding: "4px 10px",
              borderRadius: 999,
              background: isAdmin ? "rgba(139, 92, 246, 0.12)" : "rgba(59, 130, 246, 0.12)",
              color: isAdmin ? "#8B5CF6" : "#3B82F6",
              border: `1px solid ${isAdmin ? "rgba(139,92,246,.3)" : "rgba(59,130,246,.3)"}`,
            }}
          >
            {isAdmin ? "Team-wide view" : "My performance"}
          </span>
          {!isAdmin && (
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Only leads and touches assigned to or logged by you
            </span>
          )}
        </div>
        <Segmented
          value={months}
          onChange={setMonths}
          options={[
            { value: 3, label: "3M" },
            { value: 6, label: "6M" },
            { value: 12, label: "12M" },
          ]}
        />
      </div>

      {/* KPIs */}
      <div style={grid(160)}>
        <KpiTile label={isAdmin ? "Total leads" : "My leads"} value={totalLeads} accent={colors.orange} />
        <KpiTile
          label={isAdmin ? "Clients" : "My conversions"}
          value={clientCount}
          hint={`${conversionRate}% conversion`}
          accent={colors.green}
        />
        <KpiTile
          label="Upcoming follow-ups"
          value={upcomingCount}
          hint={heatmap.overdue ? `${heatmap.overdue} overdue` : "None overdue"}
          accent={BLUE}
        />
        <KpiTile label="Flagged" value={flagCount} accent="#e34948" />
        {isAdmin && (
          <KpiTile label="Orders / Invoices" value={invoices.length} accent="#6250d6" />
        )}
      </div>

      {/* trend + gauge */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <Panel
          title="Lead trend"
          subtitle={`${trendTotal} leads created in the last ${months} months`}
          style={{ flex: "2 1 460px" }}
        >
          {trendTotal === 0 ? (
            <Empty>No leads created in this period</Empty>
          ) : (
            <div style={{ position: "relative", height: 260 }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          )}
        </Panel>

        <Panel title="Conversion rate" subtitle="Leads that became clients" style={{ flex: "1 1 260px" }}>
          <div style={{ position: "relative", height: 230 }}>
            <Doughnut data={gaugeData} options={gaugeOptions} />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 8,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "var(--text-white)",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {conversionRate}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                {clientCount} of {totalLeads} leads
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* pipeline + heatmap */}
      <div style={grid(320)}>
        <Panel title="Pipeline by stage" subtitle="Where every lead sits right now">
          <BarList items={pipeline} total={totalLeads} />
        </Panel>

        <Panel
          title="Follow-up calendar"
          subtitle="Follow-ups due over the next 4 weeks"
          right={
            heatmap.overdue > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  color: "#e34948",
                  background: "rgba(227,73,72,.1)",
                  border: "1px solid rgba(227,73,72,.3)",
                  whiteSpace: "nowrap",
                }}
              >
                ⚠ {heatmap.overdue} overdue
              </span>
            )
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 4,
            }}
          >
            {WEEKDAY.map((d) => (
              <div
                key={d}
                style={{ fontSize: 10, color: "var(--text-ghost)", textAlign: "center", paddingBottom: 2 }}
              >
                {d}
              </div>
            ))}
            {heatmap.days.map(({ d, count, past, isToday }) => {
              const intensity = count ? 0.18 + (count / heatmap.max) * 0.82 : 0;
              return (
                <div
                  key={d.toISOString()}
                  title={`${DAY.format(d)}: ${count} follow-up${count === 1 ? "" : "s"}`}
                  style={{
                    height: 42,
                    borderRadius: 6,
                    padding: "3px 5px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontVariantNumeric: "tabular-nums",
                    opacity: past ? 0.45 : 1,
                    background: count ? withAlpha(BLUE, intensity) : withAlpha(colors.dim, 0.08),
                    color: intensity > 0.55 ? "#fff" : "var(--text-dim)",
                    outline: isToday ? `2px solid ${colors.orange}` : "none",
                    outlineOffset: -2,
                  }}
                >
                  <span style={{ fontSize: 9, opacity: 0.8 }}>{d.getDate()}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, textAlign: "right" }}>
                    {count || ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-ghost)",
            }}
          >
            Less
            {[0.18, 0.4, 0.65, 1].map((a) => (
              <span
                key={a}
                style={{ width: 12, height: 12, borderRadius: 3, background: withAlpha(BLUE, a) }}
              />
            ))}
            More · <span style={{ color: colors.orange }}>▢</span> today
          </div>
        </Panel>
      </div>

      {/* agents */}
      <Panel
        title={isAdmin ? "Agent activity" : "My activity"}
        subtitle={
          isAdmin
            ? "Touches logged per agent, split by type (top 8)"
            : "Touches you logged, split by type"
        }
      >
        {agentTotal === 0 ? (
          <Empty>No follow-ups logged yet</Empty>
        ) : (
          <div style={{ position: "relative", height: Math.max(140, agentRows.labels.length * 38 + 60) }}>
            <Bar data={agentData} options={agentOptions} />
          </div>
        )}
      </Panel>

      {/* sources, cities, engagement */}
      <div style={grid(260)}>
        <Panel title="Lead sources" subtitle="Where leads come from">
          <BarList items={sources} color={BLUE} />
        </Panel>
        <Panel title="Top cities" subtitle="Leads by city">
          <BarList items={cities} color={colors.orange} />
        </Panel>
        <Panel title="Engagement" subtitle="How actively leads are being worked">
          {engagement.total === 0 ? (
            <Empty />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Meter label="Touched" value={engagement.touched} total={engagement.total} color={colors.green} />
              <Meter
                label="WhatsApp sent"
                value={engagement.waSent}
                total={engagement.total}
                color={BLUE}
              />
              <Meter
                label="WhatsApp replied"
                value={engagement.waReplied}
                total={engagement.waSent || 0}
                color={colors.orange}
              />
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Avg calls per lead:{" "}
                <strong style={{ color: "var(--text-white)" }}>
                  {(engagement.calls / engagement.total).toFixed(1)}
                </strong>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}