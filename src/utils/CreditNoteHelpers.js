/**
 * Credit-note formatting, status / type / refund-method labels, usability rules, and the
 * credit-note PDF.
 *
 * Shared bits for everything credit-note related in the CRM:
 * formatting, status/type labels and the Credit Note PDF (same look as
 * the invoice PDF in InvoiceListPage).
 *
 * Used by: 13 files (shared), e.g. components/creditnote/ApplyCreditNoteModal.jsx,
 * components/creditnote/CnSummaryStrip.jsx, components/creditnote/CreateCreditNoteModal.jsx
 * API: creditNoteService.getById
 */

import { creditNoteService } from "../backend/ApiService.js";

import logoMain from "../assets/home/DigidentLogo.png";
import logoWatermark from "../assets/home/DigidentLogoWatermark.png";

/**
 * Rupee text with up to 2 decimals, e.g. 1234.5 -> "₹1,234.5".
 *
 * @param {number} amount
 * @returns {string}
 */
export const fmtINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Date text, e.g. "05 Mar 2026"; "—" when empty.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * Returns res.data when the API wrapped the payload, otherwise res.
 *
 * @param {object} res
 * @returns {*}
 */
export const unwrap = (res) => res?.data ?? res;

export const CN_STATUS = {
  open: {
    label: "Open",
    color: "#4ade80",
    bg: "rgba(34,197,94,.12)",
    border: "rgba(34,197,94,.3)",
  },
  partially_used: {
    label: "Partially used",
    color: "#fbbf24",
    bg: "rgba(251,191,36,.12)",
    border: "rgba(251,191,36,.3)",
  },
  used: {
    label: "Used",
    color: "#60a5fa",
    bg: "rgba(96,165,250,.12)",
    border: "rgba(96,165,250,.3)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#f87171",
    bg: "rgba(239,68,68,.12)",
    border: "rgba(239,68,68,.3)",
  },
};

export const CN_TYPE = {
  manual: { label: "Manual", color: "#a78bfa" },
  return: { label: "Return", color: "#fb923c" },
  cancellation: { label: "Cancellation", color: "#f87171" },
};

export const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

/**
 * Display text of a refund method (cash, UPI, bank ...).
 *
 * @param {string} method
 * @returns {string}
 */
export const methodLabel = (method) =>
  REFUND_METHODS.find((x) => x.value === method)?.label || method || "—";

/**
 * A credit note can still be used when it is open / partly used and has more than ₹0.01 left.
 *
 * @param {object} creditNote
 * @returns {boolean}
 */
export const isUsable = (creditNote) =>
  ["open", "partially_used"].includes(creditNote?.status) &&
  Number(creditNote?.balance || 0) > 0.01;

/**
 * Only an unused, manual credit note that is not cancelled yet can be cancelled.
 *
 * @param {object} creditNote
 * @returns {boolean}
 */
export const canCancel = (creditNote) =>
  creditNote?.type === "manual" &&
  creditNote?.status !== "cancelled" &&
  !(creditNote?.usage || []).length;

/**
 * Builds and downloads the credit-note PDF. Accepts the credit note or its id (then it is loaded
 * first).
 *
 * ════════════════════════════════════════════════════════════════════ CREDIT NOTE PDF Accepts a
 * credit note object (list shape from the API) or an id / credit note number, in which case it is
 * fetched first. ════════════════════════════════════════════════════════════════════
 *
 * @param {object|string} cnOrId
 * @returns {Promise<void>}
 */
export async function downloadCreditNotePdf(cnOrId) {
  let creditNote = cnOrId;
  if (typeof cnOrId === "string") {
    creditNote = unwrap(await creditNoteService.getById(cnOrId));
  }
  if (!creditNote?.creditNoteNumber) throw new Error("Credit note data incomplete");

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ORA = [230, 135, 54],
    BLK = [0, 0, 0],
    WHT = [255, 255, 255];
  const pageWidth = doc.internal.pageSize.width,
    pageHeight = doc.internal.pageSize.height;
  const lineHeight = 6;
  const formatDay = (x) => (x ? new Date(x).toLocaleDateString("en-GB") : "—");
  const formatTwoDecimals = (x) => Number(x || 0).toFixed(2);
  const inr = (x) =>
    `INR ${Number(x || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const seller = creditNote.seller || {};
  const billTo = creditNote.billTo || {};

  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    try {
      doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
    } catch {}
    doc.restoreGraphicsState();
  };
  const drawHeader = () => {
    drawWatermark();
    doc.setFillColor(...ORA);
    doc.rect(0, 4, 45, 4, "F");
    doc.rect(0, 10, 34, 4, "F");
    doc.setFillColor(...BLK);
    doc.rect(108, 0, pageWidth - 108, 14, "F");
    doc.triangle(108, 0, 108, 14, 93, 0, "F");
    doc.setFont("helvetica", "bold").setFontSize(28).setTextColor(0).text("CREDIT NOTE", 14, 32);
    try {
      doc.addImage(logoMain, "PNG", 148, 16, 47, 18, "lg");
    } catch {
      doc.setFontSize(15).setTextColor(...ORA);
      doc.text("Digident", 162, 9);
    }
  };
  const drawFooter = () => {
    doc.setFillColor(...BLK);
    doc.rect(0, pageHeight - 13, 100, 13, "F");
    doc.triangle(100, pageHeight - 13, 100, pageHeight, 116, pageHeight, "F");
    doc.setFillColor(...ORA);
    doc.rect(158, pageHeight - 7, pageWidth - 158, 7, "F");
    doc.triangle(158, pageHeight - 7, 158, pageHeight, 143, pageHeight, "F");
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11.5)
      .setTextColor(...BLK);
    doc.text(seller.companyName || "DIGIDENT INDIA PRIVATE LIMITED.", 14, pageHeight - 26);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(doc.splitTextToSize(seller.address || "", 180), 14, pageHeight - 21);
    doc.setTextColor(...WHT);
    doc.text(
      `Email: ${seller.email || "info@digident.in"} | Contact: ${seller.contactNumber || ""}`,
      14,
      pageHeight - 6
    );
  };

  drawHeader();

  /* ── Left: credit note meta ── */
  doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(0);
  doc.text(`Credit Note No: ${creditNote.creditNoteNumber}`, 14, 45);
  doc.text(`Credit Note Date: ${formatDay(creditNote.creditNoteDate)}`, 14, 51);
  if (creditNote.status === "cancelled") {
    doc.setFont("helvetica", "bold").setTextColor(200, 40, 40).text("CANCELLED", 14, 57);
    doc.setTextColor(0);
  }

  let leftY = 75;
  doc.setFont("helvetica", "bold").setFontSize(11).text("AGAINST INVOICE", 14, leftY);
  doc.setFont("helvetica", "normal").setFontSize(10);
  leftY += lineHeight;
  doc.text(`Invoice No : ${creditNote.invoiceNumber || "—"}`, 14, leftY);
  leftY += lineHeight;
  doc.text(`Invoice Date : ${formatDay(creditNote.invoiceDate)}`, 14, leftY);
  leftY += lineHeight;
  doc.text(`Type : ${CN_TYPE[creditNote.type]?.label || creditNote.type || "—"}`, 14, leftY);
  leftY += lineHeight;
  const reasonLines = doc.splitTextToSize(`Reason : ${creditNote.reason || "—"}`, 95);
  doc.text(reasonLines, 14, leftY);
  leftY += reasonLines.length * 5;
  leftY += 4;
  doc
    .setFont("helvetica", "bold")
    .text(`Our GSTIN : ${seller.gstin || "23AAKCD9669F1ZA"}`, 14, leftY);
  if (creditNote.customerNo) {
    leftY += lineHeight;
    doc.setFont("helvetica", "normal").text(`Customer No : ${creditNote.customerNo}`, 14, leftY);
  }

  /* ── Right: bill to ── */
  const rightX = 120;
  let rightY = 75;
  doc.setFont("helvetica", "bold").setFontSize(11).text("CREDIT TO", rightX, rightY);
  doc.setFont("helvetica", "normal").setFontSize(10);
  rightY += lineHeight;
  doc.text(billTo.contactPerson || "N/A", rightX, rightY);
  rightY += lineHeight;
  doc.text(billTo.contactNumber || "N/A", rightX, rightY);
  rightY += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text(billTo.companyName || "N/A", rightX, rightY);
  rightY += 5;
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(billTo.address || "", 75);
  doc.text(addressLines, rightX, rightY);
  rightY += addressLines.length * 5 + 1;
  doc.setFont("helvetica", "bold").text(`GSTIN: ${billTo.gstin || "N/A"}`, rightX, rightY);

  /* ── Items ── */
  const items = creditNote.items || [];
  autoTable(doc, {
    startY: Math.max(leftY, rightY) + 12,
    head: [["#", "HSN CODE", "DESCRIPTION", "QTY", "RATE", "TAXABLE", "GST", "GST AMT", "TOTAL"]],
    body: items.map((item, index) => {
      const total = Number(
        item.totalAmount ?? (item.qty || item.quantity || 0) * (item.price || 0)
      );
      const gst = Number(item.gstPercent || 0);
      const net = total / (1 + gst / 100);
      return [
        index + 1,
        item.hsnCode || "90212900",
        item.description,
        item.qty ?? item.quantity,
        formatTwoDecimals(item.price),
        formatTwoDecimals(net),
        `${gst}%`,
        formatTwoDecimals(total - net),
        formatTwoDecimals(total),
      ];
    }),
    theme: "plain",
    headStyles: { fillColor: ORA, textColor: WHT, halign: "center", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, halign: "center", cellPadding: 3 },
    columnStyles: { 2: { halign: "left" } },
    didDrawCell: (hookData) => {
      if (hookData.section === "body") {
        doc.setDrawColor(...ORA);
        doc.setLineWidth(0.1);
        doc.line(
          hookData.cell.x,
          hookData.cell.y + hookData.cell.height,
          hookData.cell.x + hookData.cell.width,
          hookData.cell.y + hookData.cell.height
        );
      }
    },
    margin: { left: 14, right: 14 },
  });

  /* ── Totals ── */
  const summary = creditNote.summary || {};
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: 110 },
    body: [
      ["Taxable Value", inr(summary.totalNet)],
      ["Total Tax", inr(summary.totalTax)],
      ["Credit Value", inr(summary.totalAmount ?? creditNote.amount)],
      ["Balance Left", inr(creditNote.balance)],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.fillColor = ORA;
        hookData.cell.styles.textColor = WHT;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  /* ── Usage history ── */
  const usage = creditNote.usage || [];
  if (usage.length) {
    let y = doc.lastAutoTable.finalY + 10;
    if (y > pageHeight - 70) {
      drawFooter();
      doc.addPage();
      drawHeader();
      y = 45;
    }
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11)
      .setTextColor(...ORA)
      .text("ADJUSTMENTS", 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["DATE", "TYPE", "DETAILS", "AMOUNT"]],
      body: usage.map((usageEntry) => [
        formatDay(usageEntry.at),
        usageEntry.kind === "applied" ? "Applied" : "Paid back",
        usageEntry.kind === "applied"
          ? `Invoice ${usageEntry.appliedToNumber || usageEntry.appliedToId || "—"}`
          : `${methodLabel(usageEntry.method)}${usageEntry.reference ? ` · Ref ${usageEntry.reference}` : ""}`,
        inr(usageEntry.amount),
      ]),
      theme: "grid",
      headStyles: { fillColor: ORA, textColor: WHT, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 3: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
  }

  if (creditNote.notes) {
    const y = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
    doc.text(doc.splitTextToSize(`Notes: ${creditNote.notes}`, pageWidth - 28), 14, y);
  }

  /* ── Signatory ── */
  const sigY = pageHeight - 50;
  doc.setDrawColor(...ORA);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 75, sigY, pageWidth - 14, sigY);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(100);
  doc.text("Authorised Signatory", pageWidth - 44.5, sigY + 5, { align: "center" });

  drawFooter();
  doc.save(`Digident_CreditNote_${creditNote.creditNoteNumber.replace(/\//g, "-")}.pdf`);
}

/**
 * Rounds rupees to paise, half up. Example: 100.005 -> 100.01.
 *
 * @param {number} amount
 * @returns {number}
 */
export const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
