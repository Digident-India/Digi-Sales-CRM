/**
 * Builds simple branded table reports (A4 landscape PDF) for Agent Performance.
 *
 * Simple branded table reports (A4 landscape) built with jspdf + jspdf-autotable.
 * Note: the built-in PDF fonts have no ₹ sign, so amounts print as "Rs.".
 *
 * Used by: components/agent/AgentDetail.jsx, pages/AgentPerformancePage.jsx
 */

import logoMain from "../assets/home/DigidentLogo.png";

const ORANGE = [230, 135, 54];
const DARK = [17, 24, 39];
const GREY = [107, 114, 128];

/**
 * Money text for PDFs, e.g. 1234.5 -> "Rs. 1,234.50" (the PDF fonts have no ₹ sign).
 *
 * @param {number} amount
 * @returns {string}
 */
export const pdfMoney = (amount) =>
  "Rs. " +
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Number with 2 decimals and Indian grouping for PDFs.
 *
 * plain number for table cells — the column header carries "(Rs.)" so amounts never wrap onto two
 * lines
 *
 * @param {number} amount
 * @returns {string}
 */
export const pdfNum = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Date text for PDFs, e.g. "05 Mar 2026"; "-" when empty.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const pdfDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

/**
 * @param {object}   opts
 * @param {string}   opts.title      big heading, e.g. "Agent Performance Report"
 * @param {string}   opts.subtitle   e.g. "01 Oct 2026 - 10 Oct 2026"
 * @param {Array<[string,string]>} opts.summary  label/value pairs shown as a strip
 * @param {Array<{title?:string, head:string[], body:any[][], foot?:any[][], align?:object}>} opts.tables
 * @param {string}   opts.filename
 */
export async function downloadReportPdf({ title, subtitle, summary = [], tables = [], filename }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;

  /* header */
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 3, "F");
  try {
    doc.addImage(logoMain, "PNG", pageWidth - margin - 38, 7, 38, 14);
  } catch {
    /* logo optional */
  }
  doc
    .setFont("helvetica", "bold")
    .setFontSize(18)
    .setTextColor(...DARK);
  doc.text(title, margin, 16);
  doc
    .setFont("helvetica", "normal")
    .setFontSize(10)
    .setTextColor(...GREY);
  if (subtitle) doc.text(subtitle, margin, 22);
  doc.text(`Generated: ${pdfDate(new Date())}`, margin, 27);

  let y = 33;

  /* summary strip */
  if (summary.length) {
    const perRow = Math.min(summary.length, 6);
    const cardWidth = (pageWidth - margin * 2 - (perRow - 1) * 3) / perRow;
    summary.forEach(([label, value], index) => {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const x = margin + col * (cardWidth + 3);
      const cardY = y + row * 17;
      doc.setFillColor(246, 246, 248);
      doc.roundedRect(x, cardY, cardWidth, 14, 1.5, 1.5, "F");
      doc
        .setFont("helvetica", "bold")
        .setFontSize(7)
        .setTextColor(...GREY);
      doc.text(String(label).toUpperCase(), x + 3, cardY + 5);
      // shrink long values so they always fit inside their box
      let fontSize = 10.5;
      doc.setFontSize(fontSize).setTextColor(...DARK);
      while (doc.getTextWidth(String(value)) > cardWidth - 6 && fontSize > 6.5) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
      }
      doc.text(String(value), x + 3, cardY + 11);
    });
    y += Math.ceil(summary.length / perRow) * 17 + 3;
  }

  /* tables */
  tables.forEach((table, idx) => {
    if (idx > 0) y = doc.lastAutoTable.finalY + 8;
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 16;
    }
    if (table.title) {
      doc
        .setFont("helvetica", "bold")
        .setFontSize(11)
        .setTextColor(...DARK);
      doc.text(table.title, margin, y + 2);
      y += 5;
    }
    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.body,
      foot: table.foot,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        overflow: "linebreak",
        textColor: [30, 30, 30],
        lineColor: [225, 225, 225],
      },
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [245, 240, 235], textColor: DARK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 250, 248] },
      columnStyles: table.align || {},
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc
          .setFont("helvetica", "normal")
          .setFontSize(8)
          .setTextColor(...GREY);
        doc.text("Digident India Pvt. Ltd. - internal report", margin, pageHeight - 6);
        doc.text(`Page ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      },
    });
  });

  doc.save(filename);
}
