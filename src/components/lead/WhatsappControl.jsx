/**
 * The one WhatsApp control an agent needs next on an inquiry (mark sent, replied, no reply, undo).
 *
 * Used by: components/lead/InquiryCard.jsx
 */

import { WhatsappIcon } from "./WhatsappIcon";

export function WhatsappControl({ lead, pending, onToggleSent, onRepliedChange }) {
  const whatsappNumber = lead.whatsapp;

  if (!whatsappNumber?.sent) {
    return (
      <button
        className="inq-chip wa"
        disabled={pending}
        onClick={() => onToggleSent(true)}
        title="Click once you've sent the WhatsApp message to this doctor — this only records it as sent"
      >
        <WhatsappIcon />
        Mark WhatsApp Sent
      </button>
    );
  }

  return (
    <>
      <button
        className="inq-chip green"
        disabled={pending}
        onClick={() => onRepliedChange(!whatsappNumber.replied)}
        title={
          whatsappNumber.replied
            ? "The doctor replied — click to log that they haven't"
            : "Click once the doctor has replied"
        }
      >
        ✓ Sent Message
      </button>
      {!whatsappNumber.replied && (
        <button
          className="inq-undo"
          disabled={pending}
          onClick={() => onToggleSent(false)}
          title="Mark the WhatsApp message as not sent"
        >
          undo
        </button>
      )}
    </>
  );
}
