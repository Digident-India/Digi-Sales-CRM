/**
 * Helpers for Agent Performance: money and date text, period presets, status labels, colours and
 * the CSV export rows.
 *
 * Used by: components/agent/AgentDetail.jsx, pages/AgentPerformancePage.jsx
 */

import { ROLE_LABELS } from "../constants/UserRoles";

/**
 * Whole-rupee text, e.g. 1234.5 -> "₹1,235".
 *
 * ── helpers ──
 *
 * @param {number} amount
 * @returns {string}
 */
export const inr = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/**
 * Rupee text with paise, e.g. 1234.5 -> "₹1,234.50".
 *
 * @param {number} amount
 * @returns {string}
 */
export const inr2 = (amount) =>
  "₹" +
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ymd = (date) => {
  const x = new Date(date);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/**
 * Date text, e.g. "05 Mar 2026"; "—" when empty.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * Safe file-name part from a name, e.g. "Ravi Kumar" -> "Ravi_Kumar".
 *
 * @param {string} [text=""]
 * @returns {string}
 */
export const slug = (text = "") =>
  text
    .trim()
    .replace(/[^\w]+/g, "_")
    .replace(/^_|_$/g, "") || "agent";

export const PRESETS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This financial year" },
  { key: "custom", label: "Custom" },
];

/**
 * Date range for a period preset (this month, last month, quarter, financial year ...). The
 * financial year starts on 1 April.
 *
 * @param {string} key One of PRESETS keys.
 * @returns {{ from: string, to: string }} yyyy-mm-dd.
 */
export const presetRange = (key) => {
  const now = new Date();
  const year = now.getFullYear(),
    month = now.getMonth();
  switch (key) {
    case "last_month":
      return { from: ymd(new Date(year, month - 1, 1)), to: ymd(new Date(year, month, 0)) };
    case "this_quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return { from: ymd(new Date(year, quarterStartMonth, 1)), to: ymd(now) };
    }
    case "this_year": {
      const financialYearStart = month >= 3 ? year : year - 1;
      return { from: ymd(new Date(financialYearStart, 3, 1)), to: ymd(now) };
    } // Indian FY starts 1 April
    default:
      return { from: ymd(new Date(year, month, 1)), to: ymd(now) };
  }
};

export const STATUS_META = {
  paid: { label: "Paid", color: "#16a34a" },
  partially_paid: { label: "Partial", color: "#d97706" },
  issued: { label: "Unpaid", color: "#2563eb" },
  draft: { label: "Draft", color: "var(--text-dim)" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
};

const statusLabel = (invoice) =>
  invoice.status === "paid" && invoice.paymentMissing > 0
    ? "Paid (payment missing)"
    : STATUS_META[invoice.status]?.label || invoice.status;

export const SOURCE_LABEL = {
  client: "Client",
  manual: "Manual order",
  ecommerce: "Ecommerce",
  other: "Old / direct",
};

const PALETTE = [
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
  "#fb923c",
  "#f87171",
];

/**
 * A stable colour from the palette for a name.
 *
 * @param {string} [text=""]
 * @returns {string} CSS colour.
 */
export const colorFor = (text = "") => {
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

/**
 * Initials of up to two words; "?" when empty.
 *
 * @param {string} [name=""]
 * @returns {string}
 */
export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

/**
 * Downloads rows as a CSV file (values are quoted).
 *
 * @param {string} filename
 * @param {string[]} head Column titles.
 * @param {Array<Array<*>>} rows
 * @returns {void}
 */
export const downloadCsv = (filename, head, rows) => {
  const csv = [head, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

/* ── export rows (shared by CSV + PDF) ── */
export const LEADER_HEAD = [
  "#",
  "Agent",
  "Role",
  "New clients",
  "Total clients",
  "Invoices",
  "Paid",
  "Partial",
  "Unpaid",
  "Units sold",
  "Billed (Rs.)",
  "Received (Rs.)",
  "Paid invoices value (Rs.)",
  "Due (Rs.)",
  "Returns (Rs.)",
  "Follow-ups",
];

/**
 * One leaderboard row for the CSV / PDF export (columns match LEADER_HEAD).
 *
 * @param {object} agent
 * @param {Function} money Formats an amount.
 * @returns {Array<*>}
 */
export const leaderRow = (agent, money) => [
  agent.rank,
  agent.name,
  ROLE_LABELS[agent.role] ?? "",
  agent.clients.won,
  agent.clients.current,
  agent.invoices.billable,
  agent.invoices.paid,
  agent.invoices.partial,
  agent.invoices.unpaid,
  agent.products.unitsSold,
  money(agent.amounts.billed),
  money(agent.amounts.received),
  money(agent.amounts.paidInvoicesValue),
  money(agent.amounts.due),
  money(agent.amounts.returned),
  agent.activity.followups,
];

export const INV_HEAD = [
  "Invoice",
  "Date",
  "Client",
  "Company",
  "Client ID",
  "Source",
  "Status",
  "Products",
  "Units",
  "Total (Rs.)",
  "Paid (Rs.)",
  "Due (Rs.)",
  "Return (Rs.)",
];

/**
 * One invoice row for the CSV / PDF export (columns match INV_HEAD).
 *
 * @param {object} invoice
 * @param {Function} money Formats an amount.
 * @param {Function} date Formats a date.
 * @returns {Array<*>}
 */
export const invRow = (invoice, money, date) => [
  invoice.invoiceNumber,
  date(invoice.invoiceDate),
  invoice.client,
  invoice.company,
  invoice.clientId,
  SOURCE_LABEL[invoice.source] || invoice.source,
  statusLabel(invoice),
  invoice.items,
  invoice.units,
  money(invoice.total),
  money(invoice.paid),
  money(invoice.due),
  money(invoice.returned),
];

/**
 * Plain number for money columns in CSV files.
 *
 * @param {number} amount
 * @returns {number}
 */
export const csvMoney = (amount) => Number(amount || 0);
