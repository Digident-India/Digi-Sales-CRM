/**
 * One inquiry card: contact details, WhatsApp state, call summary and the next actions.
 *
 * Used by: pages/InquiriesPage.jsx
 */

import { formatDateTime, getRemarkProgress, getInitials } from "../../utils/InquiryHelpers";
import { CallSummary } from "./CallSummary";
import { WhatsappControl } from "./WhatsappControl";
import { InfoCell } from "./InfoCell";

export function InquiryCard({
  lead,
  waPending,
  onToggleSent,
  onRepliedChange,
  onLogCall,
  onMoveToFollowup,
  onFlag,
}) {
  const progress = getRemarkProgress(lead);
  return (
    <div className="inq-card">
      <div className="inq-head">
        <div className="inq-avatar">{getInitials(lead.doctorName)}</div>
        <div className="inq-id">
          <div className="inq-name">{lead.doctorName}</div>
          {lead.clinicName && <div className="inq-clinic">{lead.clinicName}</div>}
        </div>
        <div className="inq-head-actions">
          <WhatsappControl
            lead={lead}
            pending={waPending}
            onToggleSent={onToggleSent}
            onRepliedChange={onRepliedChange}
          />
          <button
            className="inq-chip red icon"
            onClick={onFlag}
            title="Wrong number, wrong details, or not a real lead — flag it for review"
          >
            ⚑
          </button>
        </div>
      </div>

      <div className="inq-info">
        <InfoCell label="Phone" value={lead.contact} />
        <InfoCell label="Email" value={lead.email} />
        <InfoCell label="City" value={lead.city} />
        {lead.whatsapp?.sent && lead.whatsapp.sentAt && (
          <InfoCell label="WhatsApp sent" value={formatDateTime(lead.whatsapp.sentAt)} />
        )}
      </div>

      <CallSummary progress={progress} remarks={lead.remarkFollowups} />

      <div className="inq-actions">
        <button
          className="btn inq-log"
          onClick={onLogCall}
          title="Open a form to log the outcome of your call"
        >
          + Log a Call
        </button>
        <button
          className="btn inq-fu"
          onClick={onMoveToFollowup}
          title="The doctor is interested — move this lead to the Follow-up stage"
        >
          → Follow-up
        </button>
      </div>
    </div>
  );
}
