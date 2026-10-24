/**
 * Screen "invoices": all invoices grouped by customer, with type tabs, agent filter, fuzzy search,
 * PDFs, statements and Excel export.
 *
 * Paid / Returned / Balance figures come from getInvoiceFigures() (utils/InvoiceMath.js), so the
 * list, the invoice PDF and the statement PDF always show the same numbers.
 *
 * Screen key: "invoices" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 * API: creditNoteService.getAll, invoiceService.getByMonthYear,
 * invoiceService.getCustomerInvoicesById, invoiceService.getCustomers, invoiceService.list
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ReceiptText,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

import { invoiceService, creditNoteService } from "../backend/ApiService.js";
import { useCrm } from "../context/CrmContext";
import { showError } from "../components/ui/Alert";
import { downloadCreditNotePdf } from "../utils/CreditNoteHelpers.js";
import UpdateInvoiceModal from "../components/invoice/UpdateInvoiceModal.jsx";
import CreateInvoice from "./InvoiceFormPage.jsx";
import MonthYearExcelExport from "../components/invoice/MonthYearExcelExport.jsx";
import SettleInvoiceCreditModal from "../components/invoice/SettleInvoiceCreditModal.jsx";
import RecordInvoiceReturnModal from "../components/invoice/RecordInvoiceReturnModal.jsx";
import InvoiceDetailModal from "../components/invoice/InvoiceDetailModal.jsx";
import { getInvoiceFigures } from "../utils/InvoiceMath.js";
import { downloadInvoicePdf } from "../utils/InvoicePdf.js";

import logoMain from "../assets/home/DigidentLogo.png";
import logoWatermark from "../assets/home/DigidentLogoWatermark.png";
import { byDateDesc } from "../utils/InvoiceListHelpers.js";
import { useDebounced } from "../hooks/UseDebounced.js";
import { CustomerGroupItem } from "../components/invoice/CustomerGroupItem.jsx";

/* Invoice kahan se bana — tabs + har row par label */
const TYPE_TABS = [
  { key: "", label: "All", count: "all" },
  { key: "client", label: "Client", count: "client" },
  { key: "manual", label: "Manual Orders", count: "manual" },
  { key: "ecommerce", label: "Ecommerce", count: "ecommerce" },
  { key: "other", label: "Old / Direct", count: "other" },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
export default function ClientsInvoicePage({ onNav }) {
  const { user } = useCrm();
  const isAgent = Number(user?.role) === 4; // backend sends an agent only their own invoices

  const [typeFilter, setTypeFilter] = useState(""); // "" | client | manual | ecommerce | other
  const [agentFilter, setAgentFilter] = useState(""); // employee _id (admin / manager only)
  const [typeCounts, setTypeCounts] = useState({});
  const [agentOptions, setAgentOptions] = useState([]); // [{ id, name, count }]
  const [searchInvoices, setSearchInvoices] = useState(null); // backend search result (null = search band)
  const [searching, setSearching] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]); // GET /invoice/customers — the groups
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const GROUPS_PER_PAGE = 10;

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isUpdateOpen, setUpdateOpen] = useState(false);
  const [createCustomer, setCreateCustomer] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null); // invoice to settle a refund on
  const [returnTarget, setReturnTarget] = useState(null); // invoice to record a return on
  const [cnBusyId, setCnBusyId] = useState(null); // invoice whose credit notes are downloading
  const [detailInvoice, setDetailInvoice] = useState(null); // invoice shown in the detail modal

  /* ── Credit notes ──────────────────────────────────────────────── */
  const handleDownloadCreditNotes = async (invoice) => {
    const id = invoice.invoiceId || invoice._id;
    if (cnBusyId) return;
    setCnBusyId(id);
    try {
      const res = await creditNoteService.getAll({ invoiceId: invoice.invoiceId, limit: 50 });
      const list = (res?.data ?? res)?.creditNotes || [];
      if (!list.length) {
        showError("No credit notes found for this invoice");
        return;
      }
      for (const creditNote of list) await downloadCreditNotePdf(creditNote);
    } catch (err) {
      showError("Credit note PDF failed: " + err.message);
    } finally {
      setCnBusyId(null);
    }
  };

  // After a credit note is created (by hand, or by settling a refund as store credit)
  const offerCreditNotePdf = async (creditNote) => {
    if (!creditNote?.creditNoteNumber) return;
    const result = await Swal.fire({
      icon: "success",
      title: `Credit note ${creditNote.creditNoteNumber} created`,
      text: `₹${Number(creditNote.summary?.totalAmount ?? creditNote.amount ?? 0).toLocaleString("en-IN")} credited to ${creditNote.billTo?.companyName || creditNote.customerCompany || "the customer"}.`,
      showCancelButton: true,
      confirmButtonText: "Download PDF",
      cancelButtonText: "Close",
      confirmButtonColor: "#ea580c",
    });
    if (result.isConfirmed) {
      try {
        await downloadCreditNotePdf(creditNote.creditNoteId || creditNote.creditNoteNumber);
      } catch (err) {
        showError("Credit note PDF failed: " + err.message);
      }
    }
  };

  /* ── Fetch customers + invoices ────────────────────────────────── */
  // Groups come from GET /invoice/customers; every invoice is then hung
  // under its customer by customerNo. All invoices are loaded in one go so
  // each customer's count / total billing is complete (not just one page).
  // The tab (type) and agent filters are applied by the backend; when an agent is logged in
  // the backend itself only sends that agent's invoices.
  const fetchInvoices = useCallback(async () => {
    setInvLoading(true);
    setFetchError("");
    try {
      const [invRes, custRes] = await Promise.all([
        invoiceService.list({ page: 1, limit: 10000, type: typeFilter, createdBy: agentFilter }),
        invoiceService.getCustomers(),
      ]);
      const invData = invRes?.data ?? invRes;
      const custData = custRes?.data ?? custRes;
      const list = Array.isArray(invData) ? invData : invData?.invoices || [];
      setInvoices([...list].sort(byDateDesc));
      setTypeCounts(invData?.typeCounts || {});
      setCustomers(Array.isArray(custData) ? custData : custData?.customers || []);

      // Agent dropdown: built from the list without the agent filter (with the filter applied the list would shrink)
      if (!agentFilter && !typeFilter) {
        const creatorsById = new Map();
        list.forEach((invoice) => {
          if (!invoice.createdBy) return;
          const id = String(invoice.createdBy);
          const creator = creatorsById.get(id) || {
            id,
            name: invoice.createdByName || invoice.createdByEmail || "Unknown",
            count: 0,
          };
          creator.count += 1;
          creatorsById.set(id, creator);
        });
        setAgentOptions(
          [...creatorsById.values()].sort((first, second) => first.name.localeCompare(second.name))
        );
      }
    } catch (err) {
      setFetchError(err.message || "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  }, [typeFilter, agentFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    setCurrentPage(1);
    setOpenGroup(null);
  }, [searchTerm, typeFilter, agentFilter]);

  /* ── Search: backend fuzzy search (works with spelling mistakes:
        "rmesh" → Ramesh, last digits of the phone, invoice no.) ── */
  const debouncedSearch = useDebounced(searchTerm.trim(), 350);
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchInvoices(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    invoiceService
      .list({ search: debouncedSearch, type: typeFilter, createdBy: agentFilter, limit: 300 })
      .then((res) => {
        const payload = res?.data ?? res;
        if (!cancelled)
          setSearchInvoices(Array.isArray(payload) ? payload : payload?.invoices || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setSearchInvoices([]);
          showError("Search failed: " + err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, typeFilter, agentFilter]);

  /* ── Group invoices under the customers from the API ───────────── */
  const groupInvoices = useCallback(
    (invoiceList, { keepEmpty }) => {
      const norm = (text) =>
        String(text || "")
          .trim()
          .toLowerCase();
      const groups = new Map();
      customers.forEach((customer) => {
        groups.set(`c${customer.customerNo}`, {
          key: `c${customer.customerNo}`,
          customerNo: customer.customerNo,
          customerName: customer.companyName || customer.contactPerson || "Unknown Customer",
          contactPerson: customer.contactPerson || "",
          contactNumber: customer.contactNumber || "",
          totalAmount: 0,
          invoices: [],
        });
      });

      invoiceList.forEach((invoice) => {
        let group = invoice.customerNo != null ? groups.get(`c${invoice.customerNo}`) : null;
        if (!group) {
          // Invoice whose customerNo isn't in the customer list — match by
          // company + contact person, else give it a group of its own.
          const company = norm(invoice.billTo?.companyName);
          const person = norm(invoice.billTo?.contactPerson);
          group = [...groups.values()].find(
            (x) => norm(x.customerName) === company && norm(x.contactPerson) === person
          );
          if (!group) {
            const key = `n${company}|${person}`;
            group = groups.get(key) || {
              key,
              customerNo: invoice.customerNo,
              customerName: invoice.billTo?.companyName || "Unknown Customer",
              contactPerson: invoice.billTo?.contactPerson || "",
              contactNumber: invoice.billTo?.contactNumber || "",
              totalAmount: 0,
              invoices: [],
            };
            groups.set(key, group);
          }
        }
        group.invoices.push(invoice);
        group.totalAmount += invoice.summary?.totalPayAmount || 0;
        if (invoice.leadId && !group.leadId) {
          group.leadId = invoice.leadId;
          group.clientId = invoice.clientId || "";
        }
        group.bestScore = Math.max(group.bestScore || 0, Number(invoice.matchScore) || 0);
      });

      const list = [...groups.values()].filter((group) => keepEmpty || group.invoices.length > 0);
      // Most recently billed first; customers with no invoices yet at the end
      return list.sort(
        (first, second) =>
          new Date(second.invoices[0]?.invoiceDate || 0) -
            new Date(first.invoices[0]?.invoiceDate || 0) ||
          (first.customerNo ?? 0) - (second.customerNo ?? 0)
      );
    },
    [customers]
  );

  // When a filter (tab / agent) is on, hide customers with no invoices
  const filtersOn = !!(typeFilter || agentFilter);
  const allGroups = useMemo(
    () => groupInvoices(invoices, { keepEmpty: !filtersOn && !isAgent }),
    [groupInvoices, invoices, filtersOn, isAgent]
  );

  /* ── Search: group the backend results by customer, with the
        closest matching customer first ── */
  const customerGroups = useMemo(() => {
    if (!searchTerm.trim() || searchInvoices === null) return allGroups;
    return groupInvoices([...searchInvoices].sort(byDateDesc), { keepEmpty: false }).sort(
      (first, second) => (second.bestScore || 0) - (first.bestScore || 0)
    );
  }, [allGroups, groupInvoices, searchInvoices, searchTerm]);

  const totalItems = invoices.length;
  const totalPages = Math.max(1, Math.ceil(customerGroups.length / GROUPS_PER_PAGE));
  const pageGroups = customerGroups.slice(
    (currentPage - 1) * GROUPS_PER_PAGE,
    currentPage * GROUPS_PER_PAGE
  );

  /* ── PDF download (shared with Client Profile — see invoicePdf.js) ── */
  const handleDownload = async (invoiceId) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (err) {
      console.error("PDF error:", err);
      showError("PDF failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  /* ── Customer Statement PDF ────────────────────────────────────── */
  const handleStatement = async (group) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const ORA = [230, 135, 54];
      const BLK = [0, 0, 0];
      const WHT = [255, 255, 255];
      const GRY = [245, 245, 245];
      const pageWidth = doc.internal.pageSize.width; // 210
      const pageHeight = doc.internal.pageSize.height; // 297

      /* ── Watermark ── */
      const drawWatermark = () => {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        try {
          doc.addImage(logoWatermark, "PNG", 20, 60, 170, 140, undefined, "FAST");
        } catch {}
        doc.restoreGraphicsState();
      };

      /* ── Header ── */
      const drawHeader = () => {
        drawWatermark();
        doc.setFillColor(...ORA);
        doc.rect(0, 4, 45, 4, "F");
        doc.rect(0, 10, 34, 4, "F");
        doc.setFillColor(...BLK);
        doc.rect(108, 0, pageWidth - 108, 14, "F");
        doc.triangle(108, 0, 108, 14, 93, 0, "F");
        doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0).text("STATEMENT", 14, 32);
        try {
          doc.addImage(logoMain, "PNG", 148, 16, 47, 18, "lg");
        } catch {
          doc.setFontSize(15).setTextColor(...ORA);
          doc.text("Digident", 162, 9);
        }
      };

      /* ── Footer ── */
      const drawFooter = () => {
        doc.setFillColor(...BLK);
        doc.rect(0, pageHeight - 13, 100, 13, "F");
        doc.triangle(100, pageHeight - 13, 100, pageHeight, 116, pageHeight, "F");
        doc.setFillColor(...ORA);
        doc.rect(158, pageHeight - 7, pageWidth - 158, 7, "F");
        doc.triangle(158, pageHeight - 7, 158, pageHeight, 143, pageHeight, "F");

        doc
          .setFont("helvetica", "bold")
          .setFontSize(10)
          .setTextColor(...BLK);
        doc.text("DIGIDENT INDIA PRIVATE LIMITED.", 14, pageHeight - 28);

        doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);
        const addr =
          group.invoices?.[0]?.seller?.address ||
          "Digident India Pvt Ltd, 314, Professor Colony, Near Matlani Garden, Behind Agrawal Sweets, Sapna Sangita Road, Indore, (M.P.) 452001.";
        doc.text(doc.splitTextToSize(addr, 180), 14, pageHeight - 23);

        doc
          .setFont("helvetica", "normal")
          .setFontSize(9)
          .setTextColor(...WHT);
        const email = group.invoices?.[0]?.seller?.email || "info@digident.in";
        const contact = group.invoices?.[0]?.seller?.contactNumber || "+91 9294503001";
        doc.text(`Email: ${email}  |  Contact: ${contact}`, 14, pageHeight - 5);
      };

      /* ══════════ PAGE CONTENT ══════════ */
      drawHeader();

      /* ── Customer info block ── */
      doc.setFillColor(...ORA);
      doc.rect(14, 42, 3, 20, "F");

      doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(0);
      doc.text(group.customerName, 21, 50);

      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
      if (group.contactPerson) doc.text(group.contactPerson, 21, 57);
      if (group.contactNumber) doc.text(group.contactNumber, 21, 63);

      doc
        .setFont("helvetica", "bold")
        .setFontSize(8)
        .setTextColor(...ORA);
      doc.text("STATEMENT DATE", pageWidth - 14, 44, { align: "right" });
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
      doc.text(
        new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
        pageWidth - 14,
        51,
        { align: "right" }
      );

      /* ── Divider line ── */
      doc.setDrawColor(...ORA);
      doc.setLineWidth(0.3);
      doc.line(14, 68, pageWidth - 14, 68);

      /* ── Figures per invoice (returns / credit notes aware) ── */
      const figs = group.invoices.map((invoice) => getInvoiceFigures(invoice));
      const remaining = figs.reduce((total, figure) => total + figure.balanceDue, 0);
      const totalPaid = figs.reduce((total, figure) => total + figure.received, 0);
      const totalReturned = figs.reduce((total, figure) => total + figure.returnedValue, 0);
      const inrP = (amount) => `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

      /* ── Summary cards ── */
      const cardY = 73;
      const cardH = 24;
      const totalW = pageWidth - 28;
      const cardW = (totalW - 12) / 3;

      const cards = [
        { label: "TOTAL INVOICES", value: String(group.invoices.length), accent: ORA },
        { label: "TOTAL BILLED", value: inrP(group.totalAmount), accent: ORA },
        {
          label: "BALANCE DUE",
          value: inrP(remaining),
          accent: remaining > 0.01 ? [210, 50, 50] : [34, 160, 80],
        },
      ];

      cards.forEach((card, index) => {
        const centerX = 14 + index * (cardW + 6);
        doc.setFillColor(...GRY);
        doc.roundedRect(centerX, cardY, cardW, cardH, 2, 2, "F");
        doc.setFillColor(...card.accent);
        doc.roundedRect(centerX, cardY, cardW, 2, 1, 1, "F");
        doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(120, 120, 120);
        doc.text(card.label, centerX + cardW / 2, cardY + 9, { align: "center" });
        doc
          .setFont("helvetica", "bold")
          .setFontSize(11)
          .setTextColor(...card.accent);
        doc.text(card.value, centerX + cardW / 2, cardY + 19, { align: "center" });
      });

      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 100, 100);
      doc.text(
        `Total Returned: ${inrP(totalReturned)}   |   Total Paid: ${inrP(totalPaid)}`,
        pageWidth - 14,
        cardY + cardH + 7,
        { align: "right" }
      );

      /* ── Invoice detail table ── */
      const tableStartY = cardY + cardH + 14;

      autoTable(doc, {
        startY: tableStartY,
        head: [
          [
            "Inv No.",
            "Date",
            "Total (INR)",
            "Returned (INR)",
            "Paid (INR)",
            "Balance (INR)",
            "Status",
          ],
        ],
        body: group.invoices.map((invoice, index) => [
          invoice.invoiceNumber || "—",
          invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—",
          (invoice.summary?.totalPayAmount || 0).toFixed(2),
          figs[index].returnedValue.toFixed(2),
          figs[index].received.toFixed(2),
          figs[index].balanceDue.toFixed(2),
          (invoice.status || "").toUpperCase(),
        ]),
        theme: "plain",
        headStyles: {
          fillColor: ORA,
          textColor: WHT,
          halign: "center",
          fontSize: 8.5,
          fontStyle: "bold",
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 8.5,
          halign: "center",
          cellPadding: 3.5,
          textColor: [30, 30, 30],
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold", textColor: [200, 90, 20] },
          1: { halign: "center", textColor: [80, 80, 80] },
          5: { fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          // Returned column — amber when something was returned
          if (data.column.index === 3 && parseFloat(data.cell.raw) > 0) {
            data.cell.styles.textColor = [180, 130, 20];
          }
          // Balance column — red if owing, green if clear
          if (data.column.index === 5) {
            const val = parseFloat(data.cell.raw);
            data.cell.styles.textColor = val > 0.01 ? [210, 50, 50] : [34, 160, 80];
          }
          // Status column colour
          if (data.column.index === 6) {
            const statusText = (data.cell.raw || "").toLowerCase();
            data.cell.styles.textColor =
              statusText === "paid"
                ? [34, 160, 80]
                : statusText === "issued"
                  ? [34, 160, 80]
                  : statusText === "overdue"
                    ? [210, 50, 50]
                    : [180, 130, 20];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawCell: (hookData) => {
          if (hookData.section === "body") {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.15);
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

      /* ── Totals row below table ── */
      const sumY = doc.lastAutoTable.finalY + 6;
      doc.setFillColor(245, 240, 235);
      doc.roundedRect(14, sumY, pageWidth - 28, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold").setFontSize(9);
      doc.setTextColor(...ORA);
      doc.text("Grand Total", 18, sumY + 6.5);
      const colX = (fraction) => 14 + (pageWidth - 28) * fraction;
      doc.setTextColor(0);
      doc.text(`Billed ${inrP(group.totalAmount)}`, colX(0.3), sumY + 6.5, { align: "center" });
      doc.setTextColor(180, 130, 20);
      doc.text(`Returned ${inrP(totalReturned)}`, colX(0.52), sumY + 6.5, { align: "center" });
      doc.setTextColor(...(totalPaid > 0 ? [34, 160, 80] : [100, 100, 100]));
      doc.text(`Paid ${inrP(totalPaid)}`, colX(0.72), sumY + 6.5, { align: "center" });
      doc.setTextColor(...(remaining > 0.01 ? [210, 50, 50] : [34, 160, 80]));
      doc.text(`Due ${inrP(remaining)}`, colX(0.9), sumY + 6.5, { align: "center" });

      /* ── Authorised Signatory ── */
      const sigY = pageHeight - 50;
      doc.setDrawColor(...ORA);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - 75, sigY, pageWidth - 14, sigY);
      doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(100, 100, 100);
      doc.text("Authorised Signatory", pageWidth - 44.5, sigY + 5, { align: "center" });
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
      doc.text("DIGIDENT INDIA PRIVATE LIMITED.", pageWidth - 44.5, sigY + 11, { align: "center" });

      drawFooter();

      doc.save(`Statement_${group.customerName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error(err);
      showError("Statement failed: " + err.message);
    }
  };

  /* ── New invoice for customer ──────────────────────────────────── */
  const handleNewInvoice = async (group) => {
    try {
      setInvLoading(true);
      const customerNo = group.customerNo ?? group.invoices?.[0]?.customerNo;
      let customerInvoices = group.invoices;
      if (customerNo != null) {
        const res = await invoiceService.getCustomerInvoicesById(customerNo);
        const data = res?.data ?? res;
        customerInvoices = Array.isArray(data) ? data : data?.invoices || group.invoices;
      }
      setCreateCustomer({
        leadId: group.leadId || null, // CRM client → pre-selected in the form
        clientId: group.clientId || "",
        companyName: group.customerName,
        contactPerson: group.contactPerson,
        contactNumber: group.contactNumber,
        address: group.invoices?.[0]?.billTo?.address || "",
        gstin: group.invoices?.[0]?.billTo?.gstin || "",
        invoices: customerInvoices,
        latestInvoice: customerInvoices?.[0] || null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setInvLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setUpdateOpen(true);
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  const goTo = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pageNums = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (pageNumber) =>
        pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1
    )
    .reduce((acc, pageNumber, index, list) => {
      if (index > 0 && list[index - 1] !== pageNumber - 1) acc.push("…");
      acc.push(pageNumber);
      return acc;
    }, []);

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════════════ */
  return (
    <div className="fade-in">
      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(-5px);} to {opacity:1;transform:none;} }
        @media (max-width: 768px) {
          .acc-header { padding: 12px 14px !important; gap: 8px !important; }
          .acc-header-meta { display: none !important; }
          .acc-header-total { min-width: unset !important; }
          .inv-page-actions { flex-wrap: wrap; justify-content: flex-end; }
          .inv-page-actions > div[style*="width: 1px"] { display: none; }
        }
        @media (max-width: 480px) {
          .acc-header-total { display: none !important; }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <span className="stage-badge badge-green">Stage 3</span>
          <h2 className="page-title">Invoice Management</h2>
          <p className="page-sub">
            {isAgent ? (
              <>
                Showing <b style={{ color: "var(--text-muted)" }}>your</b> invoices only — the ones
                you created and your clients' invoices
              </>
            ) : (
              "Grouped by customer · PDF download · Statement export"
            )}
          </p>
        </div>

        <div
          className="inv-page-actions"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {/* Refresh */}
          <button
            onClick={() => fetchInvoices()}
            title="Refresh"
            style={{
              background: "none",
              border: "1px solid var(--border-mid)",
              borderRadius: 10,
              padding: "9px 11px",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "all .2s",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "rgba(234,88,12,.4)";
              event.currentTarget.style.color = "#ea580c";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "var(--border-mid)";
              event.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <RefreshCw size={15} />
          </button>

          {/* Stats */}
          {[
            { val: invLoading ? "…" : totalItems, label: "Invoices", color: "var(--green)" },
            { val: invLoading ? "…" : allGroups.length, label: "Customers", color: "#ea580c" },
          ].map(({ val, label, color }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "8px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginTop: 2,
                }}
              >
                {label}
              </div>
            </div>
          ))}

          <div style={{ width: 1, height: 28, background: "var(--border)" }} />

          {/* Excel Export */}
          <MonthYearExcelExport fetchInvoices={invoiceService.getByMonthYear} />

          <div style={{ width: 1, height: 28, background: "var(--border)" }} />

          {/* Go to Credit Notes */}
          {onNav && (
            <button
              onClick={() => onNav("credit-notes")}
              title="Open Credit Notes"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "none",
                border: "1px solid rgba(234,88,12,.35)",
                borderRadius: 10,
                padding: "9px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                color: "#ea580c",
              }}
            >
              <ReceiptText size={15} /> Credit Notes
            </button>
          )}

          {/* Create Invoice */}
          <button
            onClick={() => setCreateCustomer({})}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#ea580c",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              transition: "opacity .2s",
            }}
            onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>
      </div>

      {/* ── Tabs: invoice kahan se bana ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        {TYPE_TABS.map((typeTab) => {
          const on = typeFilter === typeTab.key;
          return (
            <button
              key={typeTab.key || "all"}
              onClick={() => setTypeFilter(typeTab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                border: on ? "1px solid rgba(234,88,12,.55)" : "1px solid var(--border-mid)",
                background: on ? "rgba(234,88,12,.12)" : "var(--bg-card)",
                color: on ? "#ea580c" : "var(--text-muted)",
              }}
            >
              {typeTab.label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: on
                    ? "rgba(234,88,12,.18)"
                    : "var(--bg-raised, rgba(148,163,184,.12))",
                  color: on ? "#ea580c" : "var(--text-dim)",
                }}
              >
                {typeCounts[typeTab.count] ?? 0}
              </span>
            </button>
          );
        })}

        {/* Admin / Manager: invoices of one agent */}
        {!isAgent && (
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
            className="input"
            title="Show invoices created by one agent"
            style={{
              width: "auto",
              minWidth: 190,
              marginLeft: "auto",
              padding: "8px 12px",
              fontSize: 12,
            }}
          >
            <option value="">All agents</option>
            {agentOptions.map((agentOption) => (
              <option key={agentOption.id} value={agentOption.id}>
                {agentOption.name} ({agentOption.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: searchTerm.trim() ? 8 : 20 }}>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 13,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-dim)",
            pointerEvents: "none",
          }}
        />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search: customer, clinic, phone, invoice no., client ID, agent… (spelling mistakes are OK)"
          className="input"
          style={{ paddingLeft: 40, paddingRight: 36 }}
        />
        {searching && (
          <Loader2
            size={15}
            style={{
              position: "absolute",
              right: 13,
              top: "50%",
              marginTop: -7.5,
              color: "var(--text-dim)",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>
      {searchTerm.trim() && searchInvoices !== null && !searching && (
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 16 }}>
          <b style={{ color: "var(--text-muted)" }}>{searchInvoices.length}</b> invoice
          {searchInvoices.length === 1 ? "" : "s"} found for “{searchTerm.trim()}”
          {searchInvoices.length
            ? " · closest matches first"
            : " · try another spelling or the last 4 digits of the phone number"}
        </div>
      )}

      {/* ── Error bar ───────────────────────────────────────────── */}
      {fetchError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(239,68,68,.1)",
            border: "1px solid rgba(239,68,68,.3)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 18,
            fontSize: 12,
            color: "#f87171",
          }}
        >
          <AlertCircle size={15} /> {fetchError}
          <button
            onClick={() => fetchInvoices()}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
              fontSize: 11,
              textDecoration: "underline",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Groups ──────────────────────────────────────────────── */}
      {invLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            gap: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "#ea580c",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Loading invoices…</span>
        </div>
      ) : customerGroups.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
            borderRadius: 16,
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <Search size={40} style={{ color: "var(--text-ghost)", marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {searchTerm
              ? `No results for "${searchTerm}"`
              : filtersOn
                ? "No invoices match this filter"
                : "No customers found"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pageGroups.map((group) => (
            <CustomerGroupItem
              key={group.key}
              group={group}
              isOpen={openGroup === group.key}
              onToggle={() =>
                setOpenGroup((prevOpenGroup) => (prevOpenGroup === group.key ? null : group.key))
              }
              onOpenInvoice={setDetailInvoice}
              onDownload={handleDownload}
              downloading={downloading}
              onEdit={handleEdit}
              onNewInvoice={handleNewInvoice}
              onStatement={handleStatement}
              onDownloadCreditNotes={handleDownloadCreditNotes}
              cnBusyId={cnBusyId}
              onProfile={onNav ? (leadId) => onNav("client-profile", String(leadId)) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: "8px 14px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: currentPage === 1 ? "var(--text-ghost)" : "var(--text-dim)",
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {pageNums.map((item, index) =>
              item === "…" ? (
                <span key={`d${index}`} style={{ color: "var(--text-ghost)", fontSize: 12 }}>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => goTo(item)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border:
                      item === currentPage
                        ? "1px solid rgba(234,88,12,.4)"
                        : "1px solid var(--border-mid)",
                    background: item === currentPage ? "rgba(234,88,12,.1)" : "transparent",
                    color: item === currentPage ? "#ea580c" : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              )
            )}

            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: "8px 14px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: currentPage === totalPages ? "var(--text-ghost)" : "var(--text-dim)",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>

          <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>
            Page <strong style={{ color: "var(--text-muted)" }}>{currentPage}</strong> of{" "}
            {totalPages}
            {" · "}
            <strong style={{ color: "var(--text-muted)" }}>{totalItems}</strong> total
          </span>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onDownload={handleDownload}
          onEdit={handleEdit}
          onDownloadCreditNotes={handleDownloadCreditNotes}
          cnBusy={cnBusyId === (detailInvoice.invoiceId || detailInvoice._id)}
          onSettle={setSettleTarget}
          onReturn={setReturnTarget}
        />
      )}
      {isUpdateOpen && selectedInvoice && (
        <UpdateInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setUpdateOpen(false);
            setSelectedInvoice(null);
          }}
          onRefresh={() => fetchInvoices()}
        />
      )}
      {createCustomer && (
        <CreateInvoice
          customerData={createCustomer}
          onClose={() => setCreateCustomer(null)}
          onSuccess={() => fetchInvoices()}
        />
      )}

      {settleTarget && (
        <SettleInvoiceCreditModal
          invoice={settleTarget}
          onClose={() => setSettleTarget(null)}
          onDone={(result) => {
            setSettleTarget(null);
            fetchInvoices();
            if (result?.creditNoteNumber) offerCreditNotePdf(result);
          }}
        />
      )}

      {returnTarget && (
        <RecordInvoiceReturnModal
          invoice={returnTarget}
          onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
