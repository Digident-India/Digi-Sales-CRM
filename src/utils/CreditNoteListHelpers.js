/**
 * Small helpers for the credit-note list: "#" number text, avatar colour, date-time text, chip
 * styles.
 *
 * Used by: components/creditnote/CreditNoteRow.jsx
 */

/**
 * Adds one "#" in front of a number (never two).
 *
 * Invoice numbers may already carry a "#" — never show it twice
 *
 * @param {string|number} value
 * @returns {string}
 */
export const hash = (value) => `#${String(value ?? "").replace(/^#+/, "")}`;

/**
 * Two-letter avatar text from a name.
 *
 * @param {string} [name=""]
 * @returns {string}
 */
export const avatarOf = (name = "") =>
  (name || "??")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Date and time text, e.g. "01 Oct 2026 · 01:24 pm"; "—" when empty.
 *
 * "01 Oct 2026 · 01:24 pm"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const fmtDateTime = (date) => {
  if (!date) return "—";
  const x = new Date(date);
  return `${x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · ${x
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase()}`;
};

export const TYPE_CHIP = {
  return: { label: "Return", color: "#0284c7", bg: "rgba(14,165,233,.12)" },
  manual: { label: "Manual", color: "#7c3aed", bg: "rgba(139,92,246,.12)" },
  cancellation: { label: "Cancellation", color: "#e11d48", bg: "rgba(244,63,94,.12)" },
};

export const STATUS_PILL = {
  open: { label: "Open", color: "#0284c7", bg: "rgba(14,165,233,.12)" },
  partially_used: { label: "Partially used", color: "#d97706", bg: "rgba(245,158,11,.14)" },
  used: { label: "Used", color: "#16a34a", bg: "rgba(34,197,94,.14)" },
  cancelled: { label: "Cancelled", color: "#e11d48", bg: "rgba(244,63,94,.12)" },
};
