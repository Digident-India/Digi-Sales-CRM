/**
 * Small coloured label used in the credit-note list (type and status).
 *
 * Used by: components/creditnote/CreditNoteRow.jsx
 */

export const Chip = ({ children, color, bg: background, mono, style }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      color,
      background: background,
      whiteSpace: "nowrap",
      fontFamily: mono ? "monospace" : "inherit",
      ...style,
    }}
  >
    {children}
  </span>
);
