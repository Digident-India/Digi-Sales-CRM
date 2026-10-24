/**
 * Small stat tile used in the invoice summary of the Create Credit Note modal.
 *
 * Used by: components/creditnote/CreateCreditNoteModal.jsx
 */

/* Small stat tile used in the invoice summary */
export const Stat = ({ label, value, color = "var(--text-white)", sub }) => (
  <div
    style={{
      background: "var(--bg-base)",
      border: "1px solid var(--border-dim)",
      borderRadius: 9,
      padding: "8px 10px",
    }}
  >
    <div
      style={{
        fontSize: 9,
        color: "var(--text-ghost)",
        textTransform: "uppercase",
        letterSpacing: ".08em",
        fontWeight: 700,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    {sub && <div style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 1 }}>{sub}</div>}
  </div>
);
