/**
 * Shared invoice pieces: colour tones, ActionButton and StatusBadge.
 *
 * Shared bits for the invoice list + invoice detail modal
 *
 * Used by: components/invoice/CustomerGroupItem.jsx, components/invoice/InvoiceDetailModal.jsx,
 * components/invoice/InvoiceTableRow.jsx
 */

import { Loader2 } from "lucide-react";

export const TONES = {
  orange: {
    bg: "rgba(249,115,22,.08)",
    color: "#ea580c",
    border: "rgba(249,115,22,.32)",
    hover: "rgba(249,115,22,.16)",
  },
  amber: {
    bg: "rgba(234,179,8,.10)",
    color: "#ca8a04",
    border: "rgba(234,179,8,.40)",
    hover: "rgba(234,179,8,.18)",
  },
  rose: {
    bg: "rgba(244,63,94,.08)",
    color: "#e11d48",
    border: "rgba(244,63,94,.30)",
    hover: "rgba(244,63,94,.16)",
  },
  green: {
    bg: "rgba(16,185,129,.08)",
    color: "#059669",
    border: "rgba(16,185,129,.35)",
    hover: "rgba(16,185,129,.16)",
  },
  violet: {
    bg: "rgba(139,92,246,.08)",
    color: "#7c3aed",
    border: "rgba(139,92,246,.30)",
    hover: "rgba(139,92,246,.16)",
  },
  gray: {
    bg: "rgba(148,163,184,.10)",
    color: "var(--text-muted)",
    border: "var(--border)",
    hover: "rgba(148,163,184,.2)",
  },
};

/* Bordered, tinted button with an icon + label */
export function ActionButton({
  icon: Icon,
  label,
  tone = "orange",
  onClick,
  busy,
  disabled,
  title,
  size = "md",
}) {
  const tonesConfig = TONES[tone] || TONES.orange;
  const off = busy || disabled;
  const isLarge = size === "lg";
  return (
    <button
      type="button"
      title={title || label}
      disabled={off}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isLarge ? 8 : 6,
        padding: isLarge ? "10px 18px" : "6px 12px",
        borderRadius: isLarge ? 10 : 8,
        fontSize: isLarge ? 14 : 12.5,
        fontWeight: isLarge ? 700 : 600,
        whiteSpace: "nowrap",
        background: tonesConfig.bg,
        color: tonesConfig.color,
        border: `1px solid ${tonesConfig.border}`,
        cursor: busy ? "wait" : off ? "not-allowed" : "pointer",
        opacity: off ? 0.6 : 1,
        transition: "background .15s",
      }}
      onMouseEnter={(event) => {
        if (!off) event.currentTarget.style.background = tonesConfig.hover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = tonesConfig.bg;
      }}
    >
      {busy ? (
        <Loader2 size={isLarge ? 17 : 15} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        Icon && <Icon size={isLarge ? 17 : 15} />
      )}
      {label && <span className={isLarge ? "desktop-only" : undefined}>{label}</span>}
    </button>
  );
}

const STATUS_TONE = {
  paid: "green",
  issued: "orange",
  partially_paid: "amber",
  overdue: "rose",
  cancelled: "gray",
  draft: "gray",
};

export function StatusBadge({ status }) {
  const statusKey = (status || "draft").toLowerCase();
  const tonesConfig = TONES[STATUS_TONE[statusKey] || "gray"];
  const label = statusKey.replace(/_/g, " ");
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: tonesConfig.bg,
        color: tonesConfig.color,
        border: `1px solid ${tonesConfig.border}`,
      }}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
