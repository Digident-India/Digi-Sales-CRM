/**
 * Writes the plain-English "what happened on this invoice" summary shown in the Create Credit Note
 * modal.
 *
 * Used by: components/creditnote/CreateCreditNoteModal.jsx
 */

import { fmtINR } from "./CreditNoteHelpers.js";

/**
 * Plain-English lines describing what happened on an invoice (returns, refunds, credit notes,
 * payments), for the Create Credit Note modal.
 *
 * Plain-language "what happened on this invoice" sentences
 *
 * @param {object} invoice
 * @param {object} fig Result of getInvoiceFigures(invoice).
 * @returns {string[]}
 */
export function buildStory(invoice, fig) {
  const out = [];
  if (fig.hasReturn) {
    out.push(`${fmtINR(fig.returnedValue)} of goods were returned.`);
  }
  const cnRefunds = (invoice.refundHistory || []).filter(
    (refund) => refund.creditNoteNumber || refund.method === "credit_note"
  );
  const cashRefunds = (invoice.refundHistory || []).filter(
    (refund) => !(refund.creditNoteNumber || refund.method === "credit_note")
  );
  cnRefunds.forEach((cnRefund) =>
    out.push(
      `${fmtINR(cnRefund.amount)} was given back as credit note ${cnRefund.creditNoteNumber || ""}.`.replace(
        "  ",
        " "
      )
    )
  );
  cashRefunds.forEach((cashRefund) =>
    out.push(
      `${fmtINR(cashRefund.amount)} was refunded by ${String(cashRefund.method || "").replace(/_/g, " ")}.`
    )
  );
  if (fig.pendingRefund > 0.01) out.push(`${fmtINR(fig.pendingRefund)} refund is still pending.`);
  (invoice.appliedCredits || []).forEach((appliedCredit) =>
    out.push(
      `${fmtINR(appliedCredit.amount)} of this invoice was paid using credit note ${appliedCredit.creditNoteNumber || ""}.`.replace(
        "  ",
        " "
      )
    )
  );
  if (!out.length) out.push("No returns, refunds or credit notes so far on this invoice.");
  return out;
}
