/**
 * getInvoiceFigures(): the one place that works out an invoice's paid, returned, refunded,
 * credit-used and due amounts.
 *
 * 1) STANDALONE (no sourceOrderId):
 *    a return / credit note does NOT change summary.paidAmount.
 *    item.returnedQty goes up; the returned units stay in items.
 * 2) ORDER-LINKED (manual order, has a sourceOrderId):
 *    the backend keeps only ACTIVE items and keeps summary.paidAmount
 *    NET of refunds. So show "Paid" exactly as the
 *    backend sent it: do not add or subtract the refund again.
 *
 * Used by: components/creditnote/CreateCreditNoteModal.jsx,
 * components/invoice/InvoiceDetailModal.jsx, components/invoice/InvoiceTableRow.jsx,
 * pages/InvoiceListPage.jsx, utils/InvoicePdf.js
 */

const num = (value) => Number(value) || 0;
const roundToPaise = (value) => Math.round((num(value) + Number.EPSILON) * 100) / 100;

/**
 * All money figures of one invoice, used by the list, the detail modal and the PDFs, so they always
 * agree. Example (standalone): total 1,000, paid 1,000, one item of 200 returned and refunded ->
 * netPayable 800, received 1,000, settledBack 200, balanceDue 0.
 *
 * @param {object} [inv={}] Invoice from the API.
 * @returns {object} isOrderLinked, total, returnedValue, netPayable, received, settledBack,
 * pendingRefund, creditApplied, balanceDue, ...
 */
export function getInvoiceFigures(inv = {}) {
  const summary = inv.summary || {};
  const total = num(summary.totalPayAmount);
  const paidRecorded = num(summary.paidAmount);
  const isOrderLinked = Boolean(inv.sourceOrderId);

  // Already given back (cash payouts + credit notes)
  const historySum = (inv.refundHistory || []).reduce(
    (total, refund) => total + num(refund.amount),
    0
  );
  const settledBack = roundToPaise(historySum > 0 ? historySum : num(inv.partialRefundAmount));

  // Still owed back, not settled yet
  const pendingRefund = roundToPaise(inv.refundableAmount);

  // Value of returned goods. For order-linked invoices the returned items are already
  // removed (the total is already lower), so 0.
  const returnedValue = isOrderLinked
    ? 0
    : roundToPaise(
        (inv.items || []).reduce((sum, item) => {
          const qty = num(item.qty);
          const returnedQty = Math.min(num(item.returnedQty), qty);
          return sum + (qty > 0 ? (num(item.totalAmount) / qty) * returnedQty : 0);
        }, 0)
      );

  // A paid invoice counts as fully received
  const received = roundToPaise(
    inv.status === "paid" ? Math.max(paidRecorded, total) : paidRecorded
  );

  const netPayable = roundToPaise(Math.max(0, total - returnedValue));

  // Order-linked: paidAmount is already net. Standalone: subtract the refunds.
  const keptPaid = isOrderLinked
    ? received
    : roundToPaise(Math.max(0, received - settledBack - pendingRefund));

  const balanceDue = roundToPaise(Math.max(0, netPayable - keptPaid));

  // A payment made with a credit note was not cash/bank, so it cannot be credited or refunded again
  const creditApplied = roundToPaise(
    (inv.appliedCredits || []).reduce(
      (total, appliedCredit) => total + num(appliedCredit.amount),
      0
    )
  );
  const creditableMoney = roundToPaise(Math.max(0, keptPaid - creditApplied));

  const returnableQty = (inv.items || []).reduce(
    (sum, item) => sum + Math.max(0, num(item.qty) - num(item.returnedQty)),
    0
  );

  return {
    isOrderLinked,
    returnableQty,
    remainingCredit: creditableMoney,
    creditApplied,
    total,
    returnedValue,
    hasReturn: returnedValue > 0.01,
    fullyReturned: returnedValue > 0.01 && netPayable <= 0.01,
    netPayable,
    received, // "Paid Amount"
    settledBack,
    pendingRefund,
    keptPaid,
    balanceDue,
  };
}
