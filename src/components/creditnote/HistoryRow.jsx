/**
 * One entry in a credit note's history (applied, refunded, cancelled).
 *
 * Used by: components/creditnote/CreditNoteDetailModal.jsx
 */

import { fmtDate } from "../../utils/CreditNoteHelpers.js";

export function HistoryRow({ icon: Icon, color, date, title, sub }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}1f`,
          color,
        }}
      >
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-white)" }}>{title}</div>
        {sub && <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
        {fmtDate(date)}
      </div>
    </div>
  );
}
