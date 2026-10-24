/**
 * Modal to record that a customer did not reply on WhatsApp and set the next contact date.
 *
 * Used by: pages/InquiriesPage.jsx
 */

import { useState } from "react";

/**
 * Popup shown when an agent unchecks "Replied" on the WhatsApp column,
 * i.e. the customer did NOT reply to the first WhatsApp message.
 * Captures a reason + a fixed date to try contacting the customer again.
 *
 * Props:
 *  - onClose(): close without saving
 *  - onSave({ reason, fixDate }): persist the no-reply info
 *  - initial: optional existing { reason, fixDate } to prefill (edit mode)
 */
export default function WhatsappNoReplyModal({ onClose, onSave, initial }) {
  const [reason, setReason] = useState(initial?.reason || "");
  const [fixDate, setFixDate] = useState(initial?.fixDate || "");

  const canSave = reason.trim() && fixDate;

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
      onClick={onClose}
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
        <h3 style={{ margin: 0, marginBottom: 4, color: "var(--text-white, #fff)" }}>
          Customer didn't reply
        </h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 12, color: "var(--text-dim, #999)" }}>
          Log why, and fix a date to try WhatsApp again.
        </p>

        <label
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--text-muted, #aaa)",
            marginBottom: 4,
          }}
        >
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Number switched off, busy, no response yet…"
          rows={3}
          style={{
            width: "100%",
            marginBottom: 14,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border-dim, #333)",
            background: "var(--input-bg)",
            color: "var(--text-white, #fff)",
            resize: "vertical",
            fontFamily: "inherit",
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
          Fix date for next contact
        </label>
        <input
          type="date"
          value={fixDate}
          onChange={(event) => setFixDate(event.target.value)}
          style={{
            width: "100%",
            marginBottom: 20,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border-dim, #333)",
            background: "var(--input-bg)",
            color: "var(--text-white, #fff)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            disabled={!canSave}
            onClick={() => canSave && onSave({ reason: reason.trim(), fixDate })}
            style={{
              background: canSave ? "var(--orange-dim, #442)" : "var(--bg-card)",
              border: "1px solid var(--orange-ring, #663)",
              color: canSave ? "var(--orange, #f80)" : "var(--text-ghost, #555)",
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
