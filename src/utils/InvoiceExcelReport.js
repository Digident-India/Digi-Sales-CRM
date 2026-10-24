/**
 * Builds the two-sheet monthly Excel report (invoice list + summary dashboard) with ExcelJS.
 *
 * Used by: components/invoice/MonthYearExcelExport.jsx
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── Color Palette (ARGB for ExcelJS) ────────────────────────────────────────
const COLORS = {
  ORANGE: "FFE68736",
  ORANGE_MID: "FFFDE8CC",
  DARK_NAVY: "FF1A1A2E",
  DARK_GRAY: "FF374151",
  MID_GRAY: "FF6B7280",
  LIGHT_GRAY: "FFF3F4F6",
  WHITE: "FFFFFFFF",
  GREEN: "FF15803D",
  GREEN_BG: "FFD1FAE5",
  YELLOW: "FFB45309",
  YELLOW_BG: "FFFEF3C7",
  RED: "FFDC2626",
  RED_BG: "FFFEE2E2",
  BLUE: "FF1D4ED8",
  BLUE_BG: "FFDBEAFE",
  BORDER_LIGHT: "FFE5E7EB",
  ROW_ALT: "FFFDF8F5",
};

// ─── ExcelJS Style Helpers ────────────────────────────────────────────────────
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

const xFont = (opts) => ({ name: "Arial", ...opts });

const xAlign = (horizontal = "left", vertical = "middle", wrap = false) => ({
  horizontal: horizontal,
  vertical: vertical,
  wrapText: wrap,
});

const xBorder = (color = COLORS.BORDER_LIGHT, style = "thin") => ({
  top: { style, color: { argb: color } },
  bottom: { style, color: { argb: color } },
  left: { style, color: { argb: color } },
  right: { style, color: { argb: color } },
});

// ─── Date / Status Helpers ───────────────────────────────────────────────────
const fmtDate = (date) => {
  if (!date) return "-";
  const currentDate = new Date(date);
  return `${String(currentDate.getDate()).padStart(2, "0")}-${MONTH_SHORT[currentDate.getMonth()]}-${currentDate.getFullYear()}`;
};

const lastDayOf = (month, year) => new Date(year, month, 0).getDate();

const getStatus = (invoice) => {
  const paid = invoice.summary?.paidAmount || 0;
  const due = invoice.summary?.amountToPay || 0;
  if (due === 0 && paid > 0) return "✔ Paid";
  if (paid > 0 && due > 0) return "⚠ Partial";
  return "⏳ Unpaid";
};

// ─── Sheet 1 : Invoice List ───────────────────────────────────────────────────
const buildInvoiceSheet = (workbook, invoices, month, year) => {
  const monthName = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const lastDay = lastDayOf(month, year);
  const today = fmtDate(new Date());
  const companyGstin = invoices[0]?.seller?.gstin || "-";
  const worksheet = workbook.addWorksheet(`${monthShort} ${year} Invoices`, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 6 }],
  });

  worksheet.columns = [
    { key: "sr", width: 5 },
    { key: "invNo", width: 13 },
    { key: "invDate", width: 14 },
    { key: "dueDate", width: 14 },
    { key: "custNo", width: 10 },
    { key: "customer", width: 34 },
    { key: "city", width: 16 },
    { key: "gstin", width: 18 },
    { key: "gross", width: 18 },
    { key: "disc", width: 16 },
    { key: "net", width: 16 },
    { key: "tax", width: 14 },
    { key: "payable", width: 18 },
    { key: "paid", width: 16 },
    { key: "due", width: 15 },
    { key: "status", width: 13 },
  ];
  const LAST_COLUMN = "P";

  // Row 1 — Company banner
  worksheet.mergeCells(`A1:${LAST_COLUMN}1`);
  Object.assign(worksheet.getCell("A1"), {
    value: "DIGIDENT INDIA PRIVATE LIMITED",
    fill: fill(COLORS.DARK_NAVY),
    font: xFont({ bold: true, size: 18, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("center", "middle"),
  });
  worksheet.getRow(1).height = 40;

  // Row 2 — Report title
  worksheet.mergeCells(`A2:${LAST_COLUMN}2`);
  Object.assign(worksheet.getCell("A2"), {
    value: `INVOICE REPORT  ·  ${monthName.toUpperCase()} ${year}`,
    fill: fill(COLORS.ORANGE),
    font: xFont({ bold: true, size: 14, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("center", "middle"),
  });
  worksheet.getRow(2).height = 28;

  // Row 3 — Period meta bar
  worksheet.mergeCells("A3:H3");
  Object.assign(worksheet.getCell("A3"), {
    value: `  Period :  01 ${monthShort} ${year}  –  ${lastDay} ${monthShort} ${year}   |   Company GSTIN :  ${companyGstin}`,
    fill: fill(COLORS.DARK_GRAY),
    font: xFont({ size: 10, color: { argb: "FFD1D5DB" } }),
    alignment: xAlign("left", "middle"),
  });
  worksheet.mergeCells("I3:K3");
  Object.assign(worksheet.getCell("I3"), {
    value: `Total Invoices :  ${invoices.length}`,
    fill: fill(COLORS.DARK_GRAY),
    font: xFont({ bold: true, size: 10, color: { argb: COLORS.ORANGE } }),
    alignment: xAlign("center", "middle"),
  });
  worksheet.mergeCells(`L3:${LAST_COLUMN}3`);
  Object.assign(worksheet.getCell("L3"), {
    value: `Generated :  ${today}`,
    fill: fill(COLORS.DARK_GRAY),
    font: xFont({ size: 10, color: { argb: "FF9CA3AF" } }),
    alignment: xAlign("right", "middle"),
  });
  worksheet.getRow(3).height = 24;

  // Row 4 — Orange accent stripe
  worksheet.getRow(4).height = 6;
  worksheet.mergeCells(`A4:${LAST_COLUMN}4`);
  worksheet.getCell("A4").fill = fill(COLORS.ORANGE);

  // Row 5 — Column headers
  const hdrs = [
    "Sr.",
    "Invoice No.",
    "Invoice Date",
    "Due Date",
    "Cust. No.",
    "Bill To (Customer)",
    "City",
    "GSTIN",
    "Gross Amount (₹)",
    "Discount (₹)",
    "Net Amount (₹)",
    "GST / Tax (₹)",
    "Total Payable (₹)",
    "Amount Paid (₹)",
    "Amount Due (₹)",
    "Status",
  ];
  worksheet.getRow(5).height = 30;
  hdrs.forEach((header, index) => {
    const cell = worksheet.getRow(5).getCell(index + 1);
    cell.value = header;
    cell.fill = fill(COLORS.ORANGE);
    cell.font = xFont({ bold: true, size: 9.5, color: { argb: COLORS.WHITE } });
    cell.alignment = xAlign("center", "middle", true);
    cell.border = {
      top: { style: "medium", color: { argb: COLORS.DARK_NAVY } },
      bottom: { style: "medium", color: { argb: COLORS.DARK_NAVY } },
      left: { style: "thin", color: { argb: "FFD97706" } },
      right: { style: "thin", color: { argb: "FFD97706" } },
    };
  });

  // Data rows
  let totGross = 0,
    totDisc = 0,
    totNet = 0,
    totTax = 0,
    totPayable = 0,
    totPaid = 0,
    totDue = 0;
  invoices.forEach((invoice, idx) => {
    const rowNumber = idx + 6;
    const rowBg = idx % 2 === 0 ? COLORS.WHITE : COLORS.ROW_ALT;
    const gross = invoice.items?.reduce((total, item) => total + item.qty * item.price, 0) || 0;
    const disc = invoice.items?.reduce((total, item) => total + (item.discountValue || 0), 0) || 0;
    const net = invoice.summary?.totalNet || 0;
    const tax = invoice.summary?.totalTax || 0;
    const pay = invoice.summary?.totalPayAmount || 0;
    const paid = invoice.summary?.paidAmount || 0;
    const due = invoice.summary?.amountToPay || 0;
    const city = invoice.billTo?.city || invoice.billTo?.address?.split(",").pop()?.trim() || "-";
    const gstin =
      invoice.billTo?.gstin && invoice.billTo.gstin.trim() !== ""
        ? invoice.billTo.gstin
        : "Not Provided";
    const status = getStatus(invoice);
    totGross += gross;
    totDisc += disc;
    totNet += net;
    totTax += tax;
    totPayable += pay;
    totPaid += paid;
    totDue += due;
    worksheet.getRow(rowNumber).height = 20;
    const vals = [
      idx + 1,
      invoice.invoiceNumber,
      fmtDate(invoice.invoiceDate),
      fmtDate(invoice.dueDate),
      invoice.customerNo,
      invoice.billTo?.companyName || invoice.billTo?.contactPerson || "-",
      city,
      gstin,
      +gross.toFixed(2),
      +disc.toFixed(2),
      +net.toFixed(2),
      +tax.toFixed(2),
      +pay.toFixed(2),
      +paid.toFixed(2),
      +due.toFixed(2),
      status,
    ];
    vals.forEach((value, index) => {
      const cell = worksheet.getRow(rowNumber).getCell(index + 1);
      cell.value = value;
      cell.fill = fill(rowBg);
      cell.border = xBorder();
      if (index >= 8 && index <= 14) {
        cell.alignment = xAlign("right", "middle");
        cell.numFmt = "#,##0.00";
        cell.font = xFont({
          size: 9.5,
          color: { argb: index === 14 && due > 0 ? COLORS.RED : COLORS.DARK_GRAY },
        });
      } else if (index === 0) {
        cell.alignment = xAlign("center", "middle");
        cell.font = xFont({ size: 9, color: { argb: COLORS.MID_GRAY } });
      } else if (index === 7) {
        cell.alignment = xAlign("center", "middle");
        cell.font = xFont({
          size: 9,
          italic: gstin === "Not Provided",
          color: { argb: gstin === "Not Provided" ? COLORS.MID_GRAY : COLORS.DARK_NAVY },
        });
      } else {
        cell.alignment = xAlign("left", "middle");
        cell.font = xFont({ size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      }
      if (index === 1) cell.font = xFont({ bold: true, size: 9.5, color: { argb: COLORS.ORANGE } });
      if (index === 5)
        cell.font = xFont({ bold: true, size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      if (index === 15) {
        cell.alignment = xAlign("center", "middle");
        if (status === "✔ Paid") {
          cell.fill = fill(COLORS.GREEN_BG);
          cell.font = xFont({ bold: true, size: 9, color: { argb: COLORS.GREEN } });
        } else if (status === "⚠ Partial") {
          cell.fill = fill(COLORS.YELLOW_BG);
          cell.font = xFont({ bold: true, size: 9, color: { argb: COLORS.YELLOW } });
        } else {
          cell.fill = fill(COLORS.RED_BG);
          cell.font = xFont({ bold: true, size: 9, color: { argb: COLORS.RED } });
        }
      }
    });
  });

  // Totals row
  const tRn = invoices.length + 6;
  worksheet.getRow(tRn).height = 26;
  [
    "",
    "TOTALS",
    "",
    "",
    "",
    `${invoices.length} Invoices`,
    "",
    "",
    +totGross.toFixed(2),
    +totDisc.toFixed(2),
    +totNet.toFixed(2),
    +totTax.toFixed(2),
    +totPayable.toFixed(2),
    +totPaid.toFixed(2),
    +totDue.toFixed(2),
    "",
  ].forEach((value, index) => {
    const cell = worksheet.getRow(tRn).getCell(index + 1);
    cell.value = value;
    cell.fill = fill(COLORS.DARK_NAVY);
    cell.font = xFont({
      bold: true,
      size: 10,
      color: { argb: index === 14 && totDue > 0 ? "FFFF8080" : COLORS.WHITE },
    });
    cell.border = xBorder(COLORS.ORANGE, "medium");
    cell.alignment =
      index >= 8 && index <= 14 ? xAlign("right", "middle") : xAlign("center", "middle");
    if (index >= 8 && index <= 14) cell.numFmt = "#,##0.00";
  });

  // Footer strip
  worksheet.mergeCells(`A${tRn + 1}:${LAST_COLUMN}${tRn + 1}`);
  worksheet.getRow(tRn + 1).height = 18;
  Object.assign(worksheet.getCell(`A${tRn + 1}`), {
    value: "DIGIDENT INDIA PVT. LTD.  ·  Confidential Invoice Report",
    fill: fill(COLORS.ORANGE),
    font: xFont({ italic: true, size: 9, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("center", "middle"),
  });

  return { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin };
};

// ─── Sheet 2 : Summary Dashboard ─────────────────────────────────────────────
const buildSummarySheet = (workbook, invoices, month, year, totals) => {
  const monthName = MONTH_NAMES[month - 1];
  const monthShort = MONTH_SHORT[month - 1];
  const worksheet = workbook.addWorksheet(`${monthShort} ${year} Summary`, {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });
  worksheet.columns = [
    { width: 4 },
    { width: 36 },
    { width: 4 },
    { width: 24 },
    { width: 4 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
  ];

  const { totGross, totDisc, totNet, totTax, totPayable, totPaid, totDue, companyGstin } = totals;
  const paidInvs = invoices.filter(
    (invoice) => (invoice.summary?.amountToPay || 0) === 0 && (invoice.summary?.paidAmount || 0) > 0
  );
  const partialInvs = invoices.filter(
    (invoice) => (invoice.summary?.paidAmount || 0) > 0 && (invoice.summary?.amountToPay || 0) > 0
  );
  const issuedInvs = invoices.filter((invoice) => (invoice.summary?.paidAmount || 0) === 0);
  const rate = totPayable > 0 ? ((totPaid / totPayable) * 100).toFixed(1) + "%" : "0.0%";

  let rowIndex = 1;
  const row = (height = 20) => {
    worksheet.getRow(rowIndex).height = height;
    return rowIndex++;
  };

  // Title block
  let currentRow = row(50);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: `${monthName.toUpperCase()} ${year}`,
    fill: fill(COLORS.DARK_NAVY),
    font: xFont({ bold: true, size: 26, color: { argb: COLORS.ORANGE } }),
    alignment: xAlign("center", "middle"),
  });
  currentRow = row(28);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: "INVOICE SUMMARY DASHBOARD",
    fill: fill(COLORS.ORANGE),
    font: xFont({ bold: true, size: 14, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("center", "middle"),
  });
  currentRow = row(22);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: `DIGIDENT INDIA PRIVATE LIMITED  ·  GSTIN: ${companyGstin}  ·  Confidential`,
    fill: fill(COLORS.DARK_GRAY),
    font: xFont({ size: 9, color: { argb: "FF9CA3AF" } }),
    alignment: xAlign("center", "middle"),
  });
  row(12);

  // KPI section header
  currentRow = row(26);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: "  KEY PERFORMANCE INDICATORS",
    fill: fill(COLORS.DARK_NAVY),
    font: xFont({ bold: true, size: 11, color: { argb: COLORS.ORANGE } }),
    alignment: xAlign("left", "middle"),
  });

  const kpis = [
    {
      label: "Total Invoices",
      value: invoices.length,
      suffix: "",
      color: COLORS.DARK_NAVY,
      bg: COLORS.LIGHT_GRAY,
    },
    {
      label: "✔  Paid",
      value: paidInvs.length,
      suffix: "",
      color: COLORS.GREEN,
      bg: COLORS.GREEN_BG,
    },
    {
      label: "⚠  Partially Paid",
      value: partialInvs.length,
      suffix: "",
      color: COLORS.YELLOW,
      bg: COLORS.YELLOW_BG,
    },
    {
      label: "⏳ Unpaid / Issued",
      value: issuedInvs.length,
      suffix: "",
      color: COLORS.RED,
      bg: COLORS.RED_BG,
    },
    {
      label: "Gross Billing",
      value: totGross,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: COLORS.WHITE,
    },
    {
      label: "Total Discounts",
      value: totDisc,
      suffix: "₹",
      color: COLORS.YELLOW,
      bg: COLORS.YELLOW_BG,
    },
    {
      label: "Net Value (ex. Tax)",
      value: totNet,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: COLORS.WHITE,
    },
    {
      label: "GST / Tax Collected",
      value: totTax,
      suffix: "₹",
      color: COLORS.MID_GRAY,
      bg: COLORS.LIGHT_GRAY,
    },
    {
      label: "Total Payable",
      value: totPayable,
      suffix: "₹",
      color: COLORS.DARK_NAVY,
      bg: "FFFDE8CC",
    },
    {
      label: "Amount Collected",
      value: totPaid,
      suffix: "₹",
      color: COLORS.GREEN,
      bg: COLORS.GREEN_BG,
    },
    {
      label: "Outstanding / Due",
      value: totDue,
      suffix: "₹",
      color: COLORS.RED,
      bg: COLORS.RED_BG,
    },
    { label: "Collection Rate", value: rate, suffix: "", color: COLORS.BLUE, bg: COLORS.BLUE_BG },
  ];
  kpis.forEach((kpi) => {
    currentRow = row(24);
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    Object.assign(worksheet.getCell(`A${currentRow}`), {
      value: "  " + kpi.label,
      fill: fill(COLORS.LIGHT_GRAY),
      font: xFont({ size: 10.5, color: { argb: COLORS.DARK_GRAY } }),
      alignment: xAlign("left", "middle"),
      border: { bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } } },
    });
    worksheet.mergeCells(`F${currentRow}:I${currentRow}`);
    const valueCell = worksheet.getCell(`F${currentRow}`);
    valueCell.fill = fill(kpi.bg);
    valueCell.font = xFont({ bold: true, size: 11, color: { argb: kpi.color } });
    valueCell.alignment = xAlign("center", "middle");
    valueCell.border = { bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } } };
    if (kpi.suffix === "₹") {
      valueCell.value = typeof kpi.value === "number" ? +kpi.value.toFixed(2) : kpi.value;
      valueCell.numFmt = "₹ #,##0.00";
    } else valueCell.value = kpi.value;
  });

  row(16);

  // Customer breakdown
  currentRow = row(26);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: `  CUSTOMER-WISE BREAKDOWN — ${monthName.toUpperCase()} ${year}`,
    fill: fill(COLORS.DARK_NAVY),
    font: xFont({ bold: true, size: 11, color: { argb: COLORS.ORANGE } }),
    alignment: xAlign("left", "middle"),
  });

  currentRow = row(26);
  [
    "",
    "Customer Name",
    "",
    "City",
    "",
    "Invoices",
    "Total Payable (₹)",
    "Paid (₹)",
    "Due (₹)",
  ].forEach((label, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = label;
    cell.fill = fill(COLORS.ORANGE);
    cell.font = xFont({ bold: true, size: 9.5, color: { argb: COLORS.WHITE } });
    cell.alignment = index >= 5 ? xAlign("center", "middle") : xAlign("left", "middle");
    cell.border = xBorder("FFFBD7B4");
  });

  const custMap = {};
  invoices.forEach((invoice) => {
    const key = invoice.billTo?.companyName || invoice.billTo?.contactPerson || "Unknown";
    const city = invoice.billTo?.city || invoice.billTo?.address?.split(",").pop()?.trim() || "-";
    if (!custMap[key]) custMap[key] = { city, count: 0, payable: 0, paid: 0, due: 0 };
    custMap[key].count++;
    custMap[key].payable += invoice.summary?.totalPayAmount || 0;
    custMap[key].paid += invoice.summary?.paidAmount || 0;
    custMap[key].due += invoice.summary?.amountToPay || 0;
  });

  Object.entries(custMap)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .forEach(([name, value], idx) => {
      currentRow = row(21);
      const rowBackground = idx % 2 === 0 ? COLORS.WHITE : COLORS.ROW_ALT;
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      Object.assign(worksheet.getCell(`A${currentRow}`), {
        value: "  " + name,
        fill: fill(rowBackground),
        font: xFont({ bold: true, size: 9.5, color: { argb: COLORS.DARK_NAVY } }),
        alignment: xAlign("left", "middle"),
        border: xBorder(),
      });
      worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
      Object.assign(worksheet.getCell(`D${currentRow}`), {
        value: value.city,
        fill: fill(rowBackground),
        font: xFont({ size: 9, color: { argb: COLORS.MID_GRAY } }),
        alignment: xAlign("left", "middle"),
        border: xBorder(),
      });
      const invoiceCountCell = worksheet.getCell(currentRow, 6);
      invoiceCountCell.value = value.count;
      invoiceCountCell.fill = fill(rowBackground);
      invoiceCountCell.font = xFont({ bold: true, size: 9.5, color: { argb: COLORS.ORANGE } });
      invoiceCountCell.alignment = xAlign("center", "middle");
      invoiceCountCell.border = xBorder();
      const payableCell = worksheet.getCell(currentRow, 7);
      payableCell.value = +value.payable.toFixed(2);
      payableCell.fill = fill(rowBackground);
      payableCell.font = xFont({ size: 9.5, color: { argb: COLORS.DARK_NAVY } });
      payableCell.alignment = xAlign("right", "middle");
      payableCell.numFmt = "#,##0.00";
      payableCell.border = xBorder();
      const paidCell = worksheet.getCell(currentRow, 8);
      paidCell.value = +value.paid.toFixed(2);
      paidCell.fill = fill(rowBackground);
      paidCell.font = xFont({
        size: 9.5,
        color: { argb: value.paid > 0 ? COLORS.GREEN : COLORS.MID_GRAY },
      });
      paidCell.alignment = xAlign("right", "middle");
      paidCell.numFmt = "#,##0.00";
      paidCell.border = xBorder();
      const dueCell = worksheet.getCell(currentRow, 9);
      dueCell.value = +value.due.toFixed(2);
      dueCell.fill = fill(value.due > 0 ? COLORS.RED_BG : COLORS.GREEN_BG);
      dueCell.font = xFont({
        bold: value.due > 0,
        size: 9.5,
        color: { argb: value.due > 0 ? COLORS.RED : COLORS.GREEN },
      });
      dueCell.alignment = xAlign("right", "middle");
      dueCell.numFmt = "#,##0.00";
      dueCell.border = xBorder();
    });

  // Grand total row
  currentRow = row(24);
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: "  GRAND TOTAL",
    fill: fill(COLORS.DARK_NAVY),
    font: xFont({ bold: true, size: 10.5, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("left", "middle"),
  });
  worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
  worksheet.getCell(`D${currentRow}`).fill = fill(COLORS.DARK_NAVY);
  const ctc = worksheet.getCell(currentRow, 6);
  ctc.value = invoices.length;
  ctc.fill = fill(COLORS.DARK_NAVY);
  ctc.font = xFont({ bold: true, size: 10, color: { argb: COLORS.ORANGE } });
  ctc.alignment = xAlign("center", "middle");
  [
    [7, totPayable],
    [8, totPaid],
    [9, totDue],
  ].forEach(([col, val]) => {
    const totalCell = worksheet.getCell(currentRow, col);
    totalCell.value = +val.toFixed(2);
    totalCell.fill = fill(COLORS.DARK_NAVY);
    totalCell.font = xFont({
      bold: true,
      size: 10,
      color: { argb: col === 9 && totDue > 0 ? "FFFF8080" : COLORS.WHITE },
    });
    totalCell.alignment = xAlign("right", "middle");
    totalCell.numFmt = "#,##0.00";
    totalCell.border = xBorder(COLORS.ORANGE, "medium");
  });

  currentRow = row(18);
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  Object.assign(worksheet.getCell(`A${currentRow}`), {
    value: "Generated by DigiDent CRM  ·  DIGIDENT INDIA PVT. LTD.  ·  Confidential",
    fill: fill(COLORS.ORANGE),
    font: xFont({ italic: true, size: 9, color: { argb: COLORS.WHITE } }),
    alignment: xAlign("center", "middle"),
  });
};

// ─── Main Excel Generator ─────────────────────────────────────────────────────
/**
 * Creates and downloads the monthly invoice report: sheet 1 lists every invoice, sheet 2 is the
 * summary dashboard.
 *
 * @param {object[]} invoices
 * @param {number} month 1-12.
 * @param {number} year
 * @returns {Promise<void>}
 */
export const generateExcel = async (invoices, month, year) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Digident India Pvt. Ltd.";
  workbook.created = workbook.modified = new Date();
  const totals = buildInvoiceSheet(workbook, invoices, month, year);
  buildSummarySheet(workbook, invoices, month, year, totals);
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Digident_${MONTH_NAMES[month - 1]}_${year}_InvoiceReport.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
