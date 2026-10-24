/**
 * Clickable number card used as a filter on the Admin page.
 *
 * Used by: pages/AdminPage.jsx
 */

export function StatCard({ label, value, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 120px",
        textAlign: "left",
        background: active ? `${accent}14` : "var(--bg-card)",
        border: `1px solid ${active ? accent : "var(--border-dim)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 120ms ease, background 120ms ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: "var(--text-ghost)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || "var(--text-white)" }}>
        {value}
      </div>
    </button>
  );
}
