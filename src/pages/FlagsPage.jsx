/**
 * Screen "flags": leads flagged by agents for wrong or unverifiable contact details.
 *
 * Screen key: "flags" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import { useState } from "react";
import { useCrm } from "../context/CrmContext";
import { InfoCell, getInitials } from "../components/lead/LeadCardParts";
import { showError, confirmDanger } from "../components/ui/Alert";

function formatDateTime(date) {
  if (!date) return "—";
  const currentDate = new Date(date);
  if (isNaN(currentDate)) return date;
  return currentDate.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FlagsPage() {
  // Added unflagLead from the CRM state context
  const { leads, search, loading, deleteLead, unflagLead } = useCrm();
  const [processingId, setProcessingId] = useState(null);

  const rows = leads
    .filter((lead) => lead.stage === "flag")
    .filter(
      (lead) =>
        !search ||
        [lead.doctorName, lead.clinicName, lead.city, lead.contact, lead.flagReason]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
    )
    // Most recently flagged first
    .sort((leadA, leadB) => new Date(leadB.flaggedAt || 0) - new Date(leadA.flaggedAt || 0));

  async function handleDelete(id, name) {
    const ok = await confirmDanger(
      "Delete this entry?",
      `Permanently remove "${name || "this entry"}"? This can't be undone.`,
      "Yes, delete it"
    );
    if (!ok) return;
    setProcessingId(id);
    try {
      await deleteLead(id);
    } catch (error) {
      showError(error.message || "Couldn't delete this entry");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUnflag(id, name) {
    const ok = await confirmDanger(
      "Restore this entry?",
      `Clear flag status for "${name || "this entry"}" and return it to the follow-up funnel?`,
      "Yes, restore it"
    );
    if (!ok) return;
    setProcessingId(id);
    try {
      if (unflagLead) {
        await unflagLead(id);
      }
    } catch (error) {
      showError(error.message || "Couldn't restore this entry");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="fade-in">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <span
            className="stage-badge badge-red"
            style={{
              background: "var(--red-dim, #442222)",
              border: "1px solid var(--red-ring, #844)",
              color: "var(--red, #f66)",
            }}
          >
            Flagged
          </span>
          <h2 className="page-title">Flagged Entries</h2>
          <p className="page-sub">
            Leads flagged by agents for wrong or unverifiable contact / information
          </p>
        </div>
        <div className="inq-header-tools">
          <div className="page-count">
            <div className="page-count-num" style={{ color: "var(--red, #f66)" }}>
              {rows.length}
            </div>
            <div className="page-count-label">Records</div>
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          Loading records…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          No flagged entries — nice and clean.
        </div>
      ) : (
        <div className="inq-list">
          {rows.map((row) => (
            <div key={row._id} className="inq-card flag-card">
              <div className="inq-head">
                <div className="inq-avatar flag">{getInitials(row.doctorName)}</div>
                <div className="inq-id">
                  <div className="inq-name">{row.doctorName}</div>
                  {row.clinicName && <div className="inq-clinic">{row.clinicName}</div>}
                </div>
                <div className="inq-head-actions">
                  <button
                    className="inq-chip red"
                    onClick={() => handleDelete(row._id, row.doctorName)}
                    disabled={processingId === row._id}
                    title="Permanently remove this flagged entry"
                  >
                    {processingId === row._id ? "Removing…" : "🗑 Delete"}
                  </button>
                </div>
              </div>

              <div className="inq-info">
                <InfoCell label="Phone" value={row.contact} />
                <InfoCell label="Email" value={row.email} />
                <InfoCell label="City" value={row.city} />
              </div>

              <div className="flag-reason">
                <div className="inq-info-lbl">Flag reason</div>
                <div className="flag-reason-text">{row.flagReason || "—"}</div>
              </div>

              <div className="flag-meta">
                Flagged by <strong>{row.flaggedBy || "—"}</strong> · {formatDateTime(row.flaggedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
