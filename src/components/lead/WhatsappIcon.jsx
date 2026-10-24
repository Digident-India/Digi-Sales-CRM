/**
 * WhatsApp logo icon.
 *
 * Used by: components/lead/WhatsappControl.jsx
 */

// WhatsApp state → the one control the agent needs next.
//   not sent → "Mark WhatsApp Sent" (just records sent = true; it does not open WhatsApp)
//   sent     → only "✓ Replied": while replied is false, clicking it marks the reply;
//              once replied, clicking it opens the no-reply modal to undo.
export function WhatsappIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.4 0-2.9-.4-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}
