/**
 * Re-exports the three credit-note action modals (apply, refund, detail) so existing imports keep
 * working.
 *
 * • ApplyCreditNoteModal — use the credit on one of this customer's
 *                           unpaid invoices (counts as payment there)
 * • RefundCreditNoteModal — pay the balance back (cash / UPI / …)
 * • CreditNoteDetailModal — everything about one credit note + history
 *
 * Used by: pages/CreditNotesPage.jsx
 */

export { CreditNoteDetailModal } from "./CreditNoteDetailModal.jsx";
export { RefundCreditNoteModal } from "./RefundCreditNoteModal.jsx";
export { ApplyCreditNoteModal } from "./ApplyCreditNoteModal.jsx";
