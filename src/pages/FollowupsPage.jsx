/**
 * Screen "followups" (stage 2): leads in the pre-sale follow-up funnel with their touch history.
 *
 * Screen key: "followups" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import { useState } from "react";
import { useCrm } from "../context/CrmContext";
import FollowupModal from "../components/followup/FollowupModal";
import ConvertToClientModal from "../components/lead/ConvertToClientModal";
import FlagModal from "../components/lead/FlagModal";
import TouchHistory from "../components/lead/TouchHistory";
import { InfoCell, getInitials } from "../components/lead/LeadCardParts";
import { showError } from "../components/ui/Alert";
import Swal from "sweetalert2";

const fmtNextDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

export default function FollowupsPage({ onNav }) {
  const { leads, search, loading, pushToFlag } = useCrm();

  const [followupModal, setFollowupModal] = useState(null);
  const [convertLead, setConvertLead] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null); // lead._id, same pattern as InquiriesPage

  const handleLog = (id, stageType, stepIndex) => setFollowupModal({ id, stageType, stepIndex });

  async function confirmFlag({ reason }) {
    try {
      await pushToFlag(flagTarget, reason);
      setFlagTarget(null);
      onNav("flags");
    } catch (error) {
      showError(error.message || "Couldn't flag this lead");
    }
  }

  const rows = leads
    .filter((lead) => lead.stage === "followup")
    .filter(
      (lead) =>
        !search ||
        [lead.doctorName, lead.clinicName, lead.city]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
    );

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <span className="stage-badge badge-yellow">Stage 2</span>
          <h2 className="page-title">Pre-Sale Follow-Up Funnel</h2>
          <p className="page-sub">
            Unlimited auditable touches per lead · Current month shown to agents · Full history
            admin-only
          </p>
        </div>
        <div className="inq-header-tools">
          <div className="page-count">
            <div className="page-count-num" style={{ color: "var(--yellow)" }}>
              {rows.length}
            </div>
            <div className="page-count-label">Active</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          No follow-ups in pipeline
        </div>
      ) : (
        <div className="inq-list">
          {rows.map((row) => (
            <div key={row._id} className="inq-card yellow-card">
              <div className="inq-head">
                <div className="inq-avatar yellow">{getInitials(row.doctorName)}</div>
                <div className="inq-id">
                  <div className="inq-name">{row.doctorName}</div>
                  {row.clinicName && <div className="inq-clinic">{row.clinicName}</div>}
                </div>
                <div className="inq-head-actions">
                  <button
                    className="inq-chip green"
                    onClick={() => setConvertLead(row)}
                    title="The doctor bought — convert this lead to a client"
                  >
                    ✓ Convert to Client
                  </button>
                  <button
                    className="inq-chip red icon"
                    onClick={() => setFlagTarget(row._id)}
                    title="Wrong number, wrong details, or not a real lead — flag it for review"
                  >
                    ⚑
                  </button>
                </div>
              </div>

              <div className="inq-info two-col">
                <InfoCell label="Phone" value={row.contact} />
                <InfoCell label="City" value={row.city} />
                <InfoCell label="Agent" value={row.assignedAgent} />
                <InfoCell
                  label="Next follow-up"
                  value={row.nextFollowUpDate ? fmtNextDate(row.nextFollowUpDate) : ""}
                />
              </div>

              {row.moveReason && (
                <div className="inq-note orange">
                  <div className="inq-info-lbl">Moved because</div>
                  <div className="inq-note-text">“{row.moveReason}”</div>
                </div>
              )}

              <div className="inq-section">
                <div className="inq-info-lbl">Pre-sale touches</div>
                <TouchHistory
                  account={row}
                  arr={row.preSaleFollowups}
                  stageType="pre-sale"
                  onLog={handleLog}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {followupModal && (
        <FollowupModal
          targetId={followupModal.id}
          stageType={followupModal.stageType}
          stepIndex={followupModal.stepIndex}
          onClose={() => setFollowupModal(null)}
        />
      )}

      {convertLead && (
        <ConvertToClientModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onSuccess={async (client) => {
            setConvertLead(null);
            // Client created → offer to create an invoice right away
            const result = await Swal.fire({
              icon: "success",
              title: "Client created",
              text: `${client?.clinicName || client?.doctorName || "Client"} is now in the Client Book. Create an invoice now?`,
              showCancelButton: true,
              confirmButtonText: "📄 Create Invoice",
              cancelButtonText: "Later",
              confirmButtonColor: "#ea580c",
            });
            if (result.isConfirmed && client?._id)
              onNav("create-invoice", { ...client, returnTo: "clients" });
            else onNav("clients");
          }}
        />
      )}

      {flagTarget && <FlagModal onClose={() => setFlagTarget(null)} onConfirm={confirmFlag} />}
    </div>
  );
}
