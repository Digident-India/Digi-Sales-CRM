/**
 * Modal to log a touch (call / visit) on a follow-up lead: notes, hurdle and next follow-up date.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/FollowupsPage.jsx
 */

import { useState } from "react";
import { useCrm } from "../../context/CrmContext";

export default function FollowupModal({ targetId, stageType, stepIndex, onClose }) {
  const { addFollowup, user } = useCrm();

  // Safely extract local YYYY-MM-DD string without UTC timezone offsets skipping days
  const getLocalTodayString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalTodayString();

  const [notes, setNotes] = useState("");
  const [hurdle, setHurdle] = useState("");
  const [date, setDate] = useState(""); // Controls the calendar date string
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const agentName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Agent"
    : "Agent";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await addFollowup(targetId, stageType, {
        notes,
        hurdle: hurdle || "None noted",
        nextCallDate: date, // Submits the validated selected date payload
      });
      onClose();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <p className="modal-title">Log Touch #{stepIndex + 1}</p>
            <p className="modal-subtitle">{stageType} stage</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-group">
          {/* Agent — read-only from JWT */}
          <div>
            <label className="label">Agent Signature</label>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid var(--border-mid)",
                borderRadius: 10,
                padding: "9px 13px",
                color: "var(--orange)",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              {agentName}
            </div>
          </div>

          <div>
            <label className="label">Interaction Notes *</label>
            <textarea
              required
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Detail conversation, client response, outcome…"
              className="input"
              style={{ resize: "none" }}
            />
          </div>

          <div>
            <label className="label">Hurdle / Problem</label>
            <input
              value={hurdle}
              onChange={(event) => setHurdle(event.target.value)}
              placeholder="e.g. Pricing mismatch, logistics delay"
              className="input"
            />
          </div>

          <div>
            <label className="label">Next Follow-Up Date *</label>
            <input
              type="date"
              value={date} // Fixed: Correctly wired to local state
              onChange={(event) => setDate(event.target.value)} // Fixed: Wired to state setter
              min={todayStr} // Blocks out past dates natively
              className="input"
              required
            />
          </div>

          {err && <ErrorBox msg={err} />}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Saving…" : "Commit Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div
      style={{
        background: "var(--red-dim)",
        border: "1px solid var(--red-ring)",
        borderRadius: 10,
        padding: "9px 13px",
        color: "var(--red)",
        fontSize: 12,
      }}
    >
      {msg}
    </div>
  );
}
