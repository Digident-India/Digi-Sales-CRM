/**
 * Modal to flag a lead whose contact details look wrong, with a reason.
 *
 * Used by: pages/FollowupsPage.jsx, pages/InquiriesPage.jsx
 */

import { useState } from "react";

/**
 * Shown when agent clicks the "⚑ Flag" button on a row — used when the
 * contact number, email, or other info looks wrong. Captures a reason,
 * then the caller moves the lead to the Flag page and navigates there.
 *
 * Props:
 *  - onClose(): close without saving
 *  - onConfirm({ reason }): reason + trigger the move/navigate
 */
export default function FlagModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const canSave = reason.trim().length > 0;

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
          border: "1px solid var(--red-ring, #844)",
          borderRadius: 12,
          padding: 24,
          width: "min(92vw, 380px)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 4, color: "var(--text-white, #fff)" }}>
          ⚑ Flag this entry
        </h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 12, color: "var(--text-dim, #999)" }}>
          What's wrong with the contact or information on this lead?
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
          placeholder="e.g. Wrong number, duplicate entry, invalid email…"
          rows={3}
          style={{
            width: "100%",
            marginBottom: 20,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border-dim, #333)",
            background: "var(--input-bg)",
            color: "var(--text-white, #fff)",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            disabled={!canSave}
            onClick={() => canSave && onConfirm({ reason: reason.trim() })}
            style={{
              background: canSave ? "var(--red-dim, #442222)" : "var(--bg-card)",
              border: "1px solid var(--red-ring, #844)",
              color: canSave ? "var(--red, #f66)" : "var(--text-ghost, #555)",
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            ⚑ Flag
          </button>
        </div>
      </div>
    </div>
  );
}
