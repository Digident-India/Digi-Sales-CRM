/**
 * One logged call in an inquiry's call history.
 *
 * Used by: components/lead/CallSummary.jsx
 */

import { formatDate } from "../../utils/InquiryHelpers";

// One logged call: dot, agent, status pill, reason, and "R1.2 · next date" beneath.
export function CallEntry({ entry, trailing }) {
  const picked = entry.callStatus === "Picked";
  const tone = picked ? "var(--green)" : "var(--red)";
  return (
    <div className="inq-call-entry">
      <div className="inq-call-line">
        <span className="inq-dot" style={{ background: tone }} />
        <span style={{ color: "var(--text-white)", fontWeight: 700 }}>{entry.agent}</span>
        <span
          className="inq-pill"
          style={{ color: tone, background: picked ? "var(--green-dim)" : "var(--red-dim)" }}
        >
          {entry.callStatus}
        </span>
        {entry.reason && <span style={{ color: "var(--text-dim)" }}>{entry.reason}</span>}
        {trailing}
      </div>
      <div className="inq-call-meta">
        R{entry.round}.{entry.touchNumber} · next {formatDate(entry.nextCallDate)}
      </div>
    </div>
  );
}
