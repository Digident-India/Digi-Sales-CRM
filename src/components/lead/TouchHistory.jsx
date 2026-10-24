/**
 * Month-by-month list of touches (calls / visits) logged on a lead.
 *
 * Used by: components/agent/AgentDrilldown.jsx, pages/ClientProfilePage.jsx,
 * pages/FollowupsPage.jsx
 */

import { useState, useEffect } from "react";
import { useCrm } from "../../context/CrmContext";

/* ────────────────────────────────────────────────────────────────────────
   TouchHistory — shared "unlimited touches" widget used on both the
   Follow-Up page (preSaleFollowups) and the Clients page (postSaleFollowups).

   Real entry shape (from API):
     { agent, employeeId, notes, hurdle, nextCallDate, loggedAt, _id }

   Behaviour:
   - Agents only see THIS MONTH's touches + a "+ Log Touch" button that
     always appends the next one (stepIndex = full arr.length).
   - Admins also see touches from earlier months (read-only history).
   - Touches are listed newest first in a grid (4 per row on desktop). Only
     the first row is shown; "View more" reveals the rest.
   - When a new month starts, older touches simply drop out of the
     visible "current" list for agents but stay in the DB / admin view —
     nothing is deleted, so nothing needs to be migrated.

   Styling: .th-* classes in index.css (bigger, full-width on mobile).
   ──────────────────────────────────────────────────────────────────────── */

const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : null;

const monthKey = (value) => {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

function TouchCard({ entry, number }) {
  const nextDate = fmtDate(entry.nextCallDate);
  const loggedDate = fmtDate(entry.loggedAt);

  return (
    <div className="th-card">
      <div className="th-card-head">
        <span className="th-touch">TOUCH #{number}</span>
        {entry.agent && <span className="th-agent">{entry.agent}</span>}
      </div>

      <div className="th-notes">
        {entry.notes || <span style={{ color: "var(--text-ghost)" }}>No notes added</span>}
      </div>

      {entry.hurdle && entry.hurdle !== "None noted" && (
        <div className="th-hurdle">⚠ {entry.hurdle}</div>
      )}

      <div className="th-dates">
        {nextDate && <div className="th-date next">📅 Next: {nextDate}</div>}
        {loggedDate && <div className="th-date">🕐 Logged: {loggedDate}</div>}
      </div>
    </div>
  );
}

// How many cards make up "one line" at the current screen width.
// Matches the grid columns in index.css (.th-grid).
function useCardsPerLine() {
  const calc = () => {
    if (typeof window === "undefined") return 4;
    if (window.matchMedia("(max-width: 640px)").matches) return 2;
    if (window.matchMedia("(max-width: 1100px)").matches) return 2;
    return 4;
  };
  const [count, setCount] = useState(calc);
  useEffect(() => {
    const onResize = () => setCount(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return count;
}

export default function TouchHistory({
  account,
  arr: list = [],
  stageType,
  onLog,
  readOnly = false,
}) {
  const { isAdmin } = useCrm();
  const perLine = useCardsPerLine();
  const [expanded, setExpanded] = useState(false);

  const currentKey = monthKey();
  // Newest first. Agents only see this month; admins see everything.
  const visible = list
    .map((entry, idx) => ({ entry, number: idx + 1 }))
    .filter(({ entry }) => isAdmin || monthKey(entry.loggedAt) === currentKey)
    .reverse();

  const hiddenCount = Math.max(0, visible.length - perLine);
  const shown = expanded ? visible : visible.slice(0, perLine);

  return (
    <div className="th">
      {visible.length ? (
        <div className="th-grid">
          {shown.map(({ entry, number }) => (
            <TouchCard key={entry._id || number} entry={entry} number={number} />
          ))}
        </div>
      ) : (
        <div className="th-empty">No touches logged this month</div>
      )}

      <div className="th-actions">
        {hiddenCount > 0 && (
          <button className="th-more" onClick={() => setExpanded((prevExpanded) => !prevExpanded)}>
            {expanded ? "▲ Show less" : `▼ View more · ${hiddenCount}`}
          </button>
        )}
        {!readOnly && (
          <button className="th-log" onClick={() => onLog(account._id, stageType, list.length)}>
            + Log Touch {list.length + 1}
          </button>
        )}
      </div>
    </div>
  );
}
