/**
 * Modal to log a call on an inquiry (picked up or not, notes, next call), up to 3 attempts per
 * round.
 *
 * Used by: pages/InquiriesPage.jsx
 */

import { useState } from "react";

/**
 * Form shown when agent clicks "+ Remark" in the Remark column.
 * Maps to POST /leads/:id/followup/pre-sale, which auto-tracks round +
 * touchNumber server-side and rolls into the next round automatically
 * after 3 touches in the current round — no cap error is ever thrown,
 * so this modal is never disabled for that reason.
 *
 * This component owns its OWN "saving" lock so a fast double-click (or a
 * slow network) can never fire onSave twice — that double-fire is what
 * was creating duplicate entries in preSaleFollowups.
 *
 * Props:
 * - onClose(): close without saving
 * - onSave({ callStatus, reason, nextCallDate }): async — must throw on
 * failure so this modal can re-enable the Save button and show an error
 * - progress: { round, nextTouch } - for display only
 */
export default function FollowupModal({ onClose, onSave, progress }) {
  const [callStatus, setCallStatus] = useState("");
  const [reason, setReason] = useState("");
  const [nextCallDate, setNextCallDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Get today's date in YYYY-MM-DD format to block past dates
  const todayStr = new Date().toISOString().split("T")[0];

  const canSave = !saving;

  const options = [
    { value: "Picked", label: "Phone Picked Up" },
    { value: "Not Picked", label: "Not Picked" },
  ];

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ callStatus, reason, nextCallDate });
      // onSave (parent) is expected to close the modal on success.
    } catch (error) {
      setError(error?.message || "Couldn't save follow-up. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--bg-card, #1a1a1a)",
          border: "1px solid var(--border-mid, #333)",
          borderRadius: 12,
          padding: 24,
          width: "min(92vw, 380px)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 4, color: "var(--text-white, #fff)" }}>Log a Call</h3>
        {progress && (
          <p style={{ margin: 0, marginBottom: 16, fontSize: 12, color: "var(--text-dim, #999)" }}>
            Round {progress.round} · Attempt {progress.nextTouch} of 3
            {progress.nextTouch === 3 ? " (your next call starts a new round)" : ""}
          </p>
        )}

        <label
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--text-muted, #aaa)",
            marginBottom: 6,
          }}
        >
          Did the doctor pick up?
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {options.map((opt) => (
            <label
              key={opt.value}
              onClick={() => !saving && setCallStatus(opt.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border:
                  callStatus === opt.value
                    ? "1px solid var(--orange-ring, #663)"
                    : "1px solid var(--border-dim, #333)",
                background:
                  callStatus === opt.value ? "var(--orange-dim, #442)" : "var(--input-bg)",
                color:
                  callStatus === opt.value ? "var(--orange, #f80)" : "var(--text-white, #000000)",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontSize: 13,
              }}
            >
              <input
                type="radio"
                name="call-status"
                value={opt.value}
                checked={callStatus === opt.value}
                onChange={() => setCallStatus(opt.value)}
                disabled={saving}
                style={{ accentColor: "var(--orange, #f80)" }}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <label
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--text-muted, #aaa)",
            marginBottom: 4,
          }}
        >
          What happened on the call? (optional)
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Number switched off, asked to call back evening, discussed pricing…"
          rows={3}
          disabled={saving}
          style={{
            width: "100%",
            marginBottom: 14,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border-dim, #333)",
            background: "var(--input-bg)",
            color: "var(--text-white, #000000)",
            resize: "vertical",
            fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
          }}
        />

        <label
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--text-muted, #aaa)",
            marginBottom: 4,
          }}
        >
          When should you call again? (optional)
        </label>
        <input
          type="date"
          value={nextCallDate}
          onChange={(event) => setNextCallDate(event.target.value)}
          min={todayStr} // Blocks out past dates natively
          disabled={saving}
          style={{
            width: "100%",
            marginBottom: error ? 8 : 20,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border-dim, #333)",
            background: "var(--input-bg)",
            color: "var(--text-white, #000000)",
            opacity: saving ? 0.6 : 1,
          }}
        />

        {error && (
          <p style={{ margin: 0, marginBottom: 12, fontSize: 11, color: "var(--red, #f66)" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            disabled={!canSave}
            onClick={handleSave}
            style={{
              background: canSave ? "var(--orange-dim, #442)" : "var(--bg-card)",
              border: "1px solid var(--orange-ring, #663)",
              color: canSave ? "var(--orange, #f80)" : "var(--text-ghost, #555)",
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving…" : "Save Call Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
