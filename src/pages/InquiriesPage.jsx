/**
 * Screen "inquiries" (stage 1): new leads; send WhatsApp, log calls, move to follow-up, flag,
 * import from Excel.
 *
 * Screen key: "inquiries" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import { useState, useEffect } from "react";
import { useCrm } from "../context/CrmContext";
import ExcelModal from "../components/lead/ExcelModal";
import WhatsappNoReplyModal from "../components/lead/WhatsappNoReplyModal";
import FollowupModal from "../components/followup/RemarkFollowupModal";
import MoveToFollowupModal from "../components/followup/MoveToFollowupModal";
import FlagModal from "../components/lead/FlagModal";
import { showError } from "../components/ui/Alert";
import { getRemarkProgress } from "../utils/InquiryHelpers";
import { InquiryCard } from "../components/lead/InquiryCard";
import { PaginationBar } from "../components/ui/PaginationBar";

const PAGE_SIZE = 50;

export default function InquiriesPage({ onNav }) {
  const {
    leads,
    search,
    pushToFollowup,
    pushToFlag,
    loading,
    updateWhatsapp,
    incrementCallCount,
    addRemarkFollowup, // ← was addFollowup — this is the fix that separates Remark from pre-sale
  } = useCrm();

  const [showImport, setShowImport] = useState(false);
  const [noReplyTarget, setNoReplyTarget] = useState(null);
  const [followupTarget, setFollowupTarget] = useState(null); // lead._id (Remark modal)
  const [actionFollowupTarget, setActionFollowupTarget] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);

  const allRows = leads
    .filter((lead) => lead.stage === "inquiry")
    .filter(
      (lead) =>
        !search ||
        [lead.doctorName, lead.clinicName, lead.city, lead.enquiry, lead.contact]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goPrev = () => setPage((prevPage) => Math.max(1, prevPage - 1));
  const goNext = () => setPage((prevPage) => Math.min(totalPages, prevPage + 1));

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Guards a lead's WhatsApp fields against overlapping requests: a rapid
  // double-click otherwise fires two concurrent PATCHes for the same
  // document, and the second one is rejected by the backend's optimistic
  // version check ("No matching document found ... version N").
  const [pendingWhatsapp, setPendingWhatsapp] = useState(() => new Set());
  const isWhatsappPending = (id) => pendingWhatsapp.has(id);

  async function withWhatsappGuard(id, callback) {
    if (pendingWhatsapp.has(id)) return;
    setPendingWhatsapp((prev) => new Set(prev).add(id));
    try {
      await callback();
    } finally {
      setPendingWhatsapp((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function toggleSent(id, checked) {
    await withWhatsappGuard(id, async () => {
      try {
        await updateWhatsapp(id, { sent: checked });
      } catch (error) {
        showError(error.message || "Couldn't update WhatsApp status");
      }
    });
  }

  async function handleRepliedChange(id, checked) {
    if (checked) {
      await withWhatsappGuard(id, async () => {
        try {
          await updateWhatsapp(id, { replied: true, noReply: null });
        } catch (error) {
          showError(error.message || "Couldn't update WhatsApp status");
        }
      });
    } else {
      setNoReplyTarget(id);
    }
  }

  async function saveNoReply({ reason, fixDate }) {
    try {
      await updateWhatsapp(noReplyTarget, { replied: false, noReply: { reason, fixDate } });
      setNoReplyTarget(null);
    } catch (error) {
      showError(error.message || "Couldn't save no-reply info");
    }
  }

  // Now calls POST /leads/:id/remark-followup via addRemarkFollowup.
  // Writes ONLY to lead.remarkFollowups — never touches preSaleFollowups.
  async function saveFollowup({ callStatus, reason, nextCallDate }) {
    await addRemarkFollowup(followupTarget, { callStatus, reason, nextCallDate });
    setFollowupTarget(null);
  }

  async function confirmActionFollowup({ reason }) {
    try {
      await pushToFollowup(actionFollowupTarget, reason);
      setActionFollowupTarget(null);
      onNav("followups");
    } catch (error) {
      showError(error.message || "Couldn't move this lead to Follow-ups");
    }
  }

  async function confirmFlag({ reason }) {
    try {
      await pushToFlag(flagTarget, reason);
      setFlagTarget(null);
      onNav("flags");
    } catch (error) {
      showError(error.message || "Couldn't flag this lead");
    }
  }

  const noReplyLead = leads.find((lead) => lead._id === noReplyTarget);
  const followupLead = leads.find((lead) => lead._id === followupTarget);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <span className="stage-badge badge-orange">Stage 1 of 3</span>
          <h2 className="page-title">New Inquiries</h2>
          <p className="page-sub">
            Every new lead starts here. Send a WhatsApp message, log each call you make, then move
            the lead to Follow-up (interested) or Flag it (wrong number / bad info).
          </p>
        </div>
        <div className="inq-header-tools">
          <button
            onClick={() => setShowImport(true)}
            className="btn btn-ghost btn-sm inq-import"
            title="Upload an Excel file to add many leads at once"
            style={{ letterSpacing: ".07em" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "var(--orange-ring)";
              event.currentTarget.style.color = "var(--orange)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "var(--border-mid)";
              event.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            ↑ Import from Excel
          </button>
          <div className="page-count">
            <div className="page-count-num" style={{ color: "var(--orange)" }}>
              {allRows.length}
            </div>
            <div className="page-count-label">Total Inquiries</div>
          </div>
        </div>
      </div>

      {loading && allRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          Loading your inquiries…
        </div>
      ) : allRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          {search
            ? "No inquiries match your search. Try a different name, city or phone number."
            : 'No inquiries yet. Click "Import from Excel" above to add your first leads.'}
        </div>
      ) : (
        <>
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            totalCount={allRows.length}
            onPrev={goPrev}
            onNext={goNext}
          />

          <div className="inq-list">
            {rows.map((row) => (
              <InquiryCard
                key={row._id}
                lead={row}
                waPending={isWhatsappPending(row._id)}
                onToggleSent={(checked) => toggleSent(row._id, checked)}
                onRepliedChange={(checked) => handleRepliedChange(row._id, checked)}
                onLogCall={() => setFollowupTarget(row._id)}
                onMoveToFollowup={() => setActionFollowupTarget(row._id)}
                onFlag={() => setFlagTarget(row._id)}
              />
            ))}
          </div>

          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            totalCount={allRows.length}
            onPrev={goPrev}
            onNext={goNext}
          />
        </>
      )}

      {showImport && <ExcelModal onClose={() => setShowImport(false)} />}

      {noReplyTarget && (
        <WhatsappNoReplyModal
          initial={noReplyLead?.whatsapp?.noReply}
          onClose={() => setNoReplyTarget(null)}
          onSave={saveNoReply}
        />
      )}

      {followupTarget && (
        <FollowupModal
          progress={followupLead ? getRemarkProgress(followupLead) : null}
          onClose={() => setFollowupTarget(null)}
          onSave={saveFollowup}
        />
      )}

      {actionFollowupTarget && (
        <MoveToFollowupModal
          onClose={() => setActionFollowupTarget(null)}
          onConfirm={confirmActionFollowup}
        />
      )}

      {flagTarget && <FlagModal onClose={() => setFlagTarget(null)} onConfirm={confirmFlag} />}
    </div>
  );
}
