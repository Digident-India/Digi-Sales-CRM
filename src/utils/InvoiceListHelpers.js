/**
 * Small helpers for the Invoices screen: INR text, newest-first sort and invoice source.
 *
 * Used by: components/invoice/CustomerGroupItem.jsx, components/invoice/InvoiceTableRow.jsx,
 * pages/InvoiceListPage.jsx
 */

/* ── helpers ─────────────────────────────────────────────────────── */
/**
 * Rupee text with Indian grouping, e.g. 1234.5 -> "₹1,234.5".
 *
 * @param {number} amount
 * @returns {string}
 */
export const fmtINR = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

/**
 * Sort comparator: newest invoice first (invoice date, else created date).
 *
 * @param {object} invoiceA
 * @param {object} invoiceB
 * @returns {number}
 */
export const byDateDesc = (invoiceA, invoiceB) =>
  new Date(invoiceB.invoiceDate || invoiceB.createdAt || 0) -
  new Date(invoiceA.invoiceDate || invoiceA.createdAt || 0);

/**
 * Label and colour of where an invoice came from: Client, Manual order, Ecommerce or Direct.
 *
 * @param {object} invoice
 * @returns {{ label: string, color: string }}
 */
export const sourceOf = (invoice) =>
  invoice.leadId
    ? { label: "Client", color: "var(--green)" }
    : invoice.sourceOrderType === "manual"
      ? { label: "Manual order", color: "#60a5fa" }
      : invoice.sourceOrderType === "ecommerce"
        ? { label: "Ecommerce", color: "#a78bfa" }
        : { label: "Old / direct", color: "var(--text-dim)" };
