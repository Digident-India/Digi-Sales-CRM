/**
 * List of call remarks logged on a lead, with the next-call date.
 *
 * Used by: components/agent/AgentDrilldown.jsx
 */

function fmtDate(date) {
  if (!date) return "—";
  const currentDate = new Date(date);
  if (isNaN(currentDate)) return date;
  return currentDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* Inline remark-followup list — mirrors the format used on InquiriesPage,
   since remarkFollowups has a different shape (round/touchNumber/callStatus)
   than pre/post-sale followups. */
export function RemarkList({ remarks = [] }) {
  if (!remarks.length) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-ghost)", fontStyle: "italic" }}>
        No remarks logged
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {remarks.map((remark, idx) => (
        <div
          key={remark._id || idx}
          style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.4 }}
        >
          <span style={{ color: "var(--text-ghost)", fontFamily: "monospace" }}>
            R{remark.round}.{remark.touchNumber}
          </span>{" "}
          <span
            style={{
              color: remark.callStatus === "Picked" ? "var(--orange)" : "var(--text-ghost)",
            }}
          >
            {remark.callStatus}
          </span>{" "}
          <span style={{ color: "var(--text-light)" }}>{remark.agent}</span> · next{" "}
          {fmtDate(remark.nextCallDate)}
          {remark.reason ? ` — ${remark.reason}` : ""}
        </div>
      ))}
    </div>
  );
}
