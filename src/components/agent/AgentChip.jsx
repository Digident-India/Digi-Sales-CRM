/**
 * Small coloured chip with an agent's initials and name (Admin page lead groups).
 *
 * Used by: pages/AdminPage.jsx
 */

import { initialsOf } from "../../utils/AdminLeadHelpers";

// A single, responsive agent filter chip: avatar initials + truncated name + counts.
// Wraps naturally onto new lines on narrow screens instead of overflowing.
export function AgentChip({ label, count, subCount, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px 5px 5px",
        borderRadius: 999,
        fontSize: 12,
        cursor: "pointer",
        background: active ? `${color}1f` : "var(--bg-card)",
        border: `1px solid ${active ? color : "var(--border-dim)"}`,
        boxShadow: active ? `0 0 0 1px ${color}40` : "none",
        color: "var(--text-white)",
        maxWidth: 220,
        transition: "border-color 120ms ease, background 120ms ease",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          flexShrink: 0,
          background: color,
          color: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {label === "All agents" ? "∀" : initialsOf(label)}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: active ? 700 : 500,
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--text-ghost)", flexShrink: 0 }}>
        {count}
        {subCount ? ` · ${subCount} new` : ""}
      </span>
    </button>
  );
}
