/**
 * Builds and downloads the Digident tax-invoice PDF.
 *
 * Shared by the Invoices page and the Client Profile page, so both download exactly the same PDF.
 * Throws on failure; callers show the error.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/InvoiceListPage.jsx
 * API: invoiceService.getById
 */

import { invoiceService } from "../backend/ApiService.js";
import { getInvoiceFigures } from "./InvoiceMath.js";
import logoMain from "../assets/home/DigidentLogo.png";
import logoWatermark from "../assets/home/DigidentLogoWatermark.png";
import bankQR from "../assets/home/BankQr.png";

/**
 * Loads an invoice and downloads its tax-invoice PDF. Throws on failure; the caller shows the
 * error.
 *
 * @param {string} invoiceId
 * @returns {Promise<void>}
 */
export async function downloadInvoicePdf(invoiceId) {
  const response = await invoiceService.getById(invoiceId);
  const order = response.data || response;
  if (!order?.items) throw new Error("Invoice data incomplete");

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ORA = [230, 135, 54],
    BLK = [0, 0, 0],
    WHT = [255, 255, 255];
  const pageWidth = doc.internal.pageSize.width,
    pageHeight = doc.internal.pageSize.height;
  const lineHeight = 6;
  const fmt = (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "—");
  const inr = (amount) => `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

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
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0).text("INVOICE", 14, 32);
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
    doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, pageHeight - 26);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(doc.splitTextToSize(order.seller?.address || "", 180), 14, pageHeight - 21);
    doc.setTextColor(...WHT);
    doc.text(
      `Email: ${order.seller?.email || "info@digident.in"} | Contact: ${order.seller?.contactNumber || ""}`,
      14,
      pageHeight - 6
    );
  };

  drawHeader();
  doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(0);
  doc.text(`Invoice Number: ${order.invoiceNumber}`, 14, 45);
  doc.text(`Invoice Date: ${fmt(order.invoiceDate)}`, 14, 51);
  doc.setFont("helvetica", "bold").text(`Due Date: ${fmt(order.dueDate)}`, 14, 57);
  const rightX = 120;
  let rightY = 75;
  doc.setFont("helvetica", "bold").setFontSize(11).text("BILL TO", rightX, rightY);
  doc.setFont("helvetica", "normal").setFontSize(10);
  rightY += lineHeight;
  doc.text(order.billTo?.contactPerson || "N/A", rightX, rightY);
  rightY += lineHeight;
  doc.text(order.billTo?.contactNumber || "N/A", rightX, rightY);
  rightY += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text(order.billTo?.companyName || "N/A", rightX, rightY);
  rightY += 5;
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(order.billTo?.address || "", 75);
  doc.text(addressLines, rightX, rightY);
  rightY += addressLines.length * lineHeight;
  doc.setFont("helvetica", "bold").text(`GSTIN: ${order.billTo?.gstin || "N/A"}`, rightX, rightY);
  rightY += 10;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Terms of Delivery : ${order.termsOfDelivery || "—"}`, rightX, rightY);
  rightY += lineHeight;
  doc.text(`Shipping Condition : ${order.shippingCondition || "—"}`, rightX, rightY);
  rightY += lineHeight;
  doc.text(`Order Date : ${fmt(order.orderDate)}`, rightX, rightY);
  let leftY = 75;
  doc
    .setFont("helvetica", "bold")
    .setFontSize(11)
    .text(`CUSTOMER NO : ${order.customerNo || "—"}`, 14, leftY);
  leftY += lineHeight;
  doc
    .setFont("helvetica", "normal")
    .text(`Payment Terms : ${order.paymentTerms || "—"}`, 14, leftY);
  leftY += lineHeight;
  doc
    .setFont("helvetica", "bold")
    .text(`Our GSTIN : ${order.seller?.gstin || "23AAKCD9669F1ZA"}`, 14, leftY);
  leftY += lineHeight + 5;
  doc.setFont("helvetica", "normal").text(`Order Number : ${order.orderNumber || "—"}`, 14, leftY);
  leftY += lineHeight;
  doc.text(`Customer Service Rep : ${order.customerServiceRep || "—"}`, 14, leftY);
  autoTable(doc, {
    startY: 155,
    head: [
      [
        "ART. NO",
        "HSN CODE",
        "DESCRIPTION",
        "QTY",
        "PRICE",
        "DISC (%)",
        "DISC VALUE",
        "Total Amount",
        "GST %",
      ],
    ],
    body: order.items.map((item) => [
      item.articleNo || "—",
      item.hsnCode || "90212900",
      item.description,
      item.qty,
      item.price,
      `${item.discountPercent}%`,
      item.discountValue?.toFixed(2),
      item.totalAmount?.toFixed(2),
      `${item.gstType} ${item.gstPercent}%`,
    ]),
    theme: "plain",
    headStyles: { fillColor: ORA, textColor: WHT, halign: "center" },
    bodyStyles: { fontSize: 8.5, halign: "center", cellPadding: 3 },
    columnStyles: {
      2: { halign: "left" }, // Description stays left-aligned for readability
    },
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
  drawFooter();
  doc.addPage();
  drawHeader();
  doc
    .setFont("helvetica", "bold")
    .setFontSize(18)
    .setTextColor(...ORA);
  doc.text("SUMMARY & TAX DETAILS", 14, 50);
  const summary = order.summary;
  const fig = getInvoiceFigures(order);
  autoTable(doc, {
    startY: 60,
    head: [["DESCRIPTION", "GOODS", "FREIGHT", "TOTAL"]],
    body: [
      [
        "Net Value",
        summary.totalNet?.toFixed(2),
        summary.freightCost?.toFixed(2),
        (summary.totalNet + summary.freightCost).toFixed(2),
      ],
      ["Total Tax", summary.totalTax?.toFixed(2), "0.00", summary.totalTax?.toFixed(2)],
      [
        "Grand Total",
        summary.totalPayAmount?.toFixed(2),
        summary.freightCost?.toFixed(2),
        summary.totalPayAmount?.toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: ORA },
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    margin: { left: 110 },
    body: [
      ["Total Payable", inr(summary.totalPayAmount)],
      ...(fig.hasReturn
        ? [
            ["Returned Goods", `- ${inr(fig.returnedValue)}`],
            ["Net Payable", inr(fig.netPayable)],
          ]
        : []),
      ["Paid Amount", inr(fig.received)],
      ...(!fig.isOrderLinked && fig.settledBack > 0.01
        ? [["Refunded / Credit Note", `- ${inr(fig.settledBack)}`]]
        : []),
      ...(!fig.isOrderLinked && fig.pendingRefund > 0.01
        ? [["Refund Pending", `- ${inr(fig.pendingRefund)}`]]
        : []),
      ["Balance Due", inr(fig.balanceDue)],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
  });
  const qrY = doc.lastAutoTable.finalY + 30;
  try {
    doc.addImage(bankQR, "PNG", 14, qrY, 35, 35, undefined, "NONE");
  } catch {}
  let textY = qrY + 5;
  const textX = 60;
  doc
    .setFont("helvetica", "bold")
    .setFontSize(11)
    .setTextColor(0)
    .text("Bank Details", textX, textY);
  doc.setFont("helvetica", "normal").setFontSize(10);
  [
    `Account No   : ${order.bankDetails?.accountNo || ""}`,
    `Account Type : ${order.bankDetails?.accountType || ""}`,
    `IFSC Code    : ${order.bankDetails?.ifscCode || ""}`,
    `Holder Name  : ${order.bankDetails?.holderName || ""}`,
  ].forEach((line) => {
    textY += 6;
    doc.text(line, textX, textY);
  });
  drawFooter();
  doc.save(`Digident_Invoice_${order.invoiceNumber}.pdf`);
}
