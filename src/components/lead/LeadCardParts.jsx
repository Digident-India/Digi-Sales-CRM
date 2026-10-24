/**
 * Small pieces shared by the card-style lead lists (Flags, Follow-ups, Clients).
 *
 * Used by: pages/ClientsPage.jsx, pages/FlagsPage.jsx, pages/FollowupsPage.jsx
 */

export function getInitials(name) {
  const parts = (name || "")
    .replace(/^dr\.?\s*/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

// `full` makes the cell span the whole row on mobile (long values like an address).
export function InfoCell({ label, value, full = false }) {
  return (
    <div className={full ? "inq-info-full" : undefined}>
      <div className="inq-info-lbl">{label}</div>
      <div className={`inq-info-val${value ? "" : " empty"}`}>{value || "Not provided"}</div>
    </div>
  );
}
