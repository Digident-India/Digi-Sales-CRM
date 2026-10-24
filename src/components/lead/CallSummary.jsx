/**
 * Latest call of an inquiry with the round / attempt counter; expands to the earlier calls.
 *
 * Used by: components/lead/InquiryCard.jsx
 */

import { useState } from "react";
import { CallEntry } from "./CallEntry";

// Latest call on one line; older touches (same layout) tucked behind "More".
export function CallSummary({ progress, remarks }) {
  const [open, setOpen] = useState(false);
  const last = progress.lastEntry;
  const earlier = (remarks || []).slice(0, -1).reverse();

  if (!last) {
    return (
      <div className="inq-call">
        <div className="inq-call-line" style={{ color: "var(--text-ghost)" }}>
          No calls logged yet · Round {progress.round} · attempt {progress.nextTouch} of 3
        </div>
      </div>
    );
  }

  return (
    <div className="inq-call">
      <CallEntry
        entry={last}
        trailing={
          earlier.length > 0 && (
            <button className="inq-more" onClick={() => setOpen((prevOpen) => !prevOpen)}>
              {open ? "▲" : "▼"} More · {earlier.length}
            </button>
          )
        }
      />
      {open &&
        earlier.map((followup, idx) => <CallEntry key={followup._id || idx} entry={followup} />)}
    </div>
  );
}
