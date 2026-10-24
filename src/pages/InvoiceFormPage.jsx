/**
 * Screen "create-invoice": form to create a tax invoice for a client, with available credit
 * applied.
 *
 * Screen key: "create-invoice" (see routes/AppRoutes.jsx)
 * Used by: pages/InvoiceListPage.jsx, routes/AppRoutes.jsx
 * API: creditNoteService.applyToInvoice, invoiceService.create, invoiceService.creditLookup,
 * invoiceService.settleRefund
 */

import { useState, useEffect, useMemo } from "react";
import { invoiceService, creditNoteService } from "../backend/ApiService.js";
import { useCrm } from "../context/CrmContext";
import ClientPicker from "../components/invoice/ClientPicker.jsx";
import {
  X as CloseIcon,
  FileText,
  Trash2,
  Plus,
  Send,
  Loader2,
  Calendar,
  Package,
  Building2,
  Wallet,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { THEME } from "../constants/InvoiceFormTheme.js";
import { Label } from "../components/invoice/Label.jsx";
import { SectionCard } from "../components/invoice/SectionCard.jsx";
import { clientFromCustomerData, billToFromClient } from "../utils/InvoiceFormHelpers.js";

/* ── Shared input ── */
const Input = ({ value, onChange, placeholder, type = "text", style = {}, list }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    list={list}
    style={{
      width: "100%",
      boxSizing: "border-box",
      background: THEME.bgBase,
      border: `1px solid ${THEME.borderDim}`,
      borderRadius: 8,
      padding: "8px 11px",
      fontSize: 12,
      color: THEME.textWhite,
      outline: "none",
      transition: "border-color .2s",
      colorScheme: "dark",
      ...style,
    }}
    onFocus={(event) => (event.target.style.borderColor = "rgba(230,135,54,.5)")}
    onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
  />
);

const Textarea = ({ value, onChange, rows = 2, placeholder }) => (
  <textarea
    value={value}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    style={{
      width: "100%",
      boxSizing: "border-box",
      background: THEME.bgBase,
      border: `1px solid ${THEME.borderDim}`,
      borderRadius: 8,
      padding: "8px 11px",
      fontSize: 12,
      color: THEME.textWhite,
      outline: "none",
      resize: "none",
      transition: "border-color .2s",
    }}
    onFocus={(event) => (event.target.style.borderColor = "rgba(230,135,54,.5)")}
    onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
  />
);

/* ── Line-item field: label on top, short hint underneath ── */
const itemInput = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: THEME.bgCard,
  border: `1px solid ${THEME.borderDim}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: THEME.textWhite,
  outline: "none",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflow: "hidden",
};

const ItemField = ({ label, hint, children }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>
      {label}
    </div>
    {children}
    {hint && (
      <div style={{ fontSize: 10.5, color: THEME.textDim, marginTop: 5, lineHeight: 1.35 }}>
        {hint}
      </div>
    )}
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <Label>{label}</Label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: "100%",
        background: THEME.bgBase,
        border: `1px solid ${THEME.borderDim}`,
        borderRadius: 8,
        padding: "8px 11px",
        fontSize: 12,
        color: THEME.textWhite,
        outline: "none",
        cursor: "pointer",
        colorScheme: "dark",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const clean = (value) => String(value ?? "").replace(/[^0-9.]/g, "");

const TODAY = new Date().toISOString().split("T")[0];
const DUE = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

const BLANK_ITEM = () => ({
  description: "",
  qty: "",
  price: "",
  discountPercent: "0",
  discountValue: "0",
  gstType: "IGST",
  gstPercent: 5,
  hsnCode: "90212900",
});

const roundToPaise = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

export default function CreateInvoice({ customerData, onClose, onSuccess }) {
  const { refetch } = useCrm();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  /* ── Client (zaroori) ── */
  const clientLocked = customerData?.stage === "client" && !!customerData?._id;
  const [client, setClient] = useState(() => clientFromCustomerData(customerData));

  /* ── "Check credit": open credit notes / pending refunds for this phone ── */
  const [credit, setCredit] = useState(null); // { available, sources: [] } once checked
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditUse, setCreditUse] = useState({}); // { [sourceKey]: amount string }

  /* ── FIX: Strictly typed array validation guard for options pre-filling ── */
  const dynamicOptions = useMemo(() => {
    // Ensuring raw customer Data maps safely even if 'invoices' is explicitly provided as null
    const baseInvoices =
      customerData && Array.isArray(customerData.invoices) ? customerData.invoices : [];

    const descs = new Set(),
      prices = new Set(),
      qtys = new Set();

    baseInvoices.forEach((baseInvoice) => {
      if (baseInvoice && Array.isArray(baseInvoice.items)) {
        baseInvoice.items.forEach((item) => {
          if (item.description) descs.add(item.description);
          if (item.price) prices.add(String(item.price));
          if (item.qty) qtys.add(String(item.qty));
        });
      }
    });

    if (qtys.size === 0) ["1", "2", "3", "5", "10"].forEach((label) => qtys.add(label));
    if (prices.size === 0)
      ["500", "1000", "1200", "1500", "2400"].forEach((label) => prices.add(label));

    return {
      descriptions: Array.from(descs),
      prices: Array.from(prices).sort((priceA, priceB) => Number(priceA) - Number(priceB)),
      quantities: Array.from(qtys).sort((qtyA, qtyB) => Number(qtyA) - Number(qtyB)),
    };
  }, [customerData]);

  /* ── Form state – prefill from customerData if provided ── */
  const [formData, setFormData] = useState(() => {
    const incomingCustomer = customerData;
    const latestInvoice = incomingCustomer?.latestInvoice;

    // Direct structural normalization mapping Lead data into local Invoice format
    const parsedCompany =
      incomingCustomer?.clinicName ||
      incomingCustomer?.companyName ||
      incomingCustomer?.doctorName ||
      "";
    const parsedContact = incomingCustomer?.doctorName || incomingCustomer?.contactPerson || "";
    const parsedPhone = incomingCustomer?.contact || incomingCustomer?.contactNumber || "";
    const parsedAddress = [
      incomingCustomer?.address,
      incomingCustomer?.city,
      incomingCustomer?.state,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      paymentTerms: latestInvoice?.paymentTerms || "Payable due amount in 10 days",
      termsOfDelivery: latestInvoice?.termsOfDelivery || "CIP Telangana",
      shippingCondition: latestInvoice?.shippingCondition || "Normal",
      customerServiceRep: latestInvoice?.customerServiceRep || "Vithalsir ( MD )",
      invoiceDate: TODAY,
      dueDate: DUE,
      deliveryDate: "",
      status: "issued",
      permission: "sales.invoice.generate",
      billTo: {
        companyName: parsedCompany,
        contactPerson: parsedContact,
        contactNumber: parsedPhone,
        address: parsedAddress,
        gstin: incomingCustomer?.gstin || "",
      },
      items: [BLANK_ITEM()],
      summary: { freightCost: "", paidAmount: "0" },
    };
  });

  /* ── Auto-fill price/discount/hsn when description matched ── */
  const handleDescriptionChange = (idx, val) => {
    const items = [...formData.items];
    items[idx].description = val;

    const baseInvoices =
      customerData && Array.isArray(customerData.invoices) ? customerData.invoices : [];

    for (const invoice of baseInvoices) {
      if (invoice && Array.isArray(invoice.items)) {
        const match = invoice.items.find(
          (item) => item.description?.toLowerCase() === val.trim().toLowerCase()
        );
        if (match) {
          items[idx].price = String(match.price || "");
          items[idx].discountPercent = String(match.discountPercent || "0");
          items[idx].discountValue = String(match.discountValue || "0");
          items[idx].hsnCode = match.hsnCode || items[idx].hsnCode || "90212900";
          break;
        }
      }
    }
    setFormData((prevFormData) => ({ ...prevFormData, items }));
  };

  /* ── Item field change with discount sync ── */
  const setItem = (idx, key, val) => {
    const items = [...formData.items];
    if (key === "description" || key === "hsnCode") {
      // Text fields — no numeric cleaning
      items[idx][key] = val;
    } else {
      const cleanValue = clean(val);
      items[idx][key] = cleanValue;
      const qty = Number(key === "qty" ? cleanValue : items[idx].qty) || 0;
      const price = Number(key === "price" ? cleanValue : items[idx].price) || 0;
      const gross = qty * price;
      if (key === "discountPercent") {
        items[idx].discountValue = String(roundToPaise((gross * Number(cleanValue)) / 100));
      } else if (key === "discountValue") {
        items[idx].discountPercent =
          gross > 0 ? String(roundToPaise((Number(cleanValue) / gross) * 100)) : "0";
      } else {
        const pct = Number(items[idx].discountPercent) || 0;
        items[idx].discountValue = String(roundToPaise((gross * pct) / 100));
      }
    }
    setFormData((prevFormData) => ({ ...prevFormData, items }));
  };

  const addItem = () =>
    setFormData((prevFormData) => ({
      ...prevFormData,
      items: [...prevFormData.items, BLANK_ITEM()],
    }));
  const removeItem = (idx) => {
    if (formData.items.length <= 1) return;
    setFormData((prevFormData) => ({
      ...prevFormData,
      items: prevFormData.items.filter((_, index) => index !== idx),
    }));
  };

  const set = (field, value) =>
    setFormData((prevFormData) => ({ ...prevFormData, [field]: value }));

  /* Client picked -> fill Bill To (the GSTIN is kept as it is). If the phone changed,
     clear the old "Check credit" result. */
  const pickClient = (client) => {
    setClient(client);
    if (client)
      setFormData((prevFormData) => ({
        ...prevFormData,
        billTo: billToFromClient(client, prevFormData.billTo),
      }));
    setCredit(null);
    setCreditUse({});
  };
  const setBT = (field, value) =>
    setFormData((prevFormData) => ({
      ...prevFormData,
      billTo: { ...prevFormData.billTo, [field]: value },
    }));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Grand total estimate (prices are GST-inclusive, same as the server) ── */
  const grandTotal = useMemo(() => {
    const items = formData.items.reduce((sum, item) => {
      const gross = (Number(item.qty) || 0) * (Number(item.price) || 0);
      return sum + gross - (Number(item.discountValue) || 0);
    }, 0);
    return roundToPaise(items + (Number(formData.summary.freightCost) || 0));
  }, [formData.items, formData.summary.freightCost]);

  const sourceKey = (src) =>
    src.kind === "credit_note" ? `cn:${src.creditNoteId}` : `inv:${src.invoiceId}`;

  const handleCheckCredit = async () => {
    const phone = formData.billTo.contactNumber.trim();
    if (!phone) {
      showToast("error", "Enter the mobile number first");
      return;
    }
    setCreditLoading(true);
    try {
      const res = await invoiceService.creditLookup(encodeURIComponent(phone));
      const data = res?.data ?? res;
      setCredit({ available: Number(data?.available || 0), sources: data?.sources || [] });
      setCreditUse({});
      if (!data?.sources?.length) showToast("success", "No credit available for this number");
    } catch (err) {
      showToast("error", err.message || "Couldn't check credit");
    } finally {
      setCreditLoading(false);
    }
  };

  const toggleSource = (src) => {
    const key = sourceKey(src);
    setCreditUse((prevCreditUse) => {
      if (prevCreditUse[key] !== undefined) {
        const { [key]: _, ...rest } = prevCreditUse;
        return rest;
      }
      const usedElsewhere = Object.values(prevCreditUse).reduce(
        (total, amount) => total + (Number(amount) || 0),
        0
      );
      const room = Math.max(
        grandTotal - (Number(formData.summary.paidAmount) || 0) - usedElsewhere,
        0
      );
      return {
        ...prevCreditUse,
        [key]: String(roundToPaise(Math.min(src.owed, room || src.owed))),
      };
    });
  };

  const creditTotal = roundToPaise(
    Object.values(creditUse).reduce(
      (total, creditUseEntry) => total + (Number(creditUseEntry) || 0),
      0
    )
  );
  const creditTooMuch =
    creditTotal > 0 &&
    creditTotal > roundToPaise(grandTotal - (Number(formData.summary.paidAmount) || 0)) + 0.01;

  /* Apply the chosen credits to the freshly created invoice.
     • open credit note  → PUT /credit-note/manage/apply-to-invoice/:id
     • pending refund on an old invoice → settle it as a credit note first
       (PUT /invoice/manage/credit-settle/:id, method "credit_note"), then
       apply that new credit note the same way.
     Both count as payment on the new invoice (its amount due goes down). */
  const applyCredits = async (newInvoiceId, newInvoiceNumber) => {
    const failures = [];
    for (const src of credit?.sources || []) {
      const amt = roundToPaise(creditUse[sourceKey(src)]);
      if (!amt || amt <= 0) continue;
      try {
        let creditNoteId = src.creditNoteId;
        if (src.kind !== "credit_note") {
          const settled = await invoiceService.settleRefund(src.invoiceId, {
            amount: amt,
            method: "credit_note",
            notes: `Used on invoice ${newInvoiceNumber}`,
          });
          creditNoteId = (settled?.data ?? settled)?.creditNoteId;
          if (!creditNoteId) throw new Error("credit note not returned");
        }
        await creditNoteService.applyToInvoice(creditNoteId, {
          invoiceId: newInvoiceId,
          amount: amt,
        });
      } catch (err) {
        failures.push(`${src.creditNoteNumber || src.invoiceNumber}: ${err.message}`);
      }
    }
    return failures;
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!client?._id) {
      showToast(
        "error",
        "Please select a client first — invoices can only be created for a client"
      );
      return;
    }
    if (!formData.billTo.companyName.trim()) {
      showToast("error", "Company name required");
      return;
    }
    if (!formData.billTo.address.trim()) {
      showToast("error", "Address required");
      return;
    }
    const hasEmpty = formData.items.some(
      (item) => !item.description.trim() || !item.qty || !item.price
    );
    if (hasEmpty) {
      showToast("error", "All items must have description, qty and price");
      return;
    }
    if (creditTooMuch) {
      showToast("error", "Credit used is more than the invoice amount due");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items: formData.items.map((item) => ({
          ...item,
          hsnCode: item.hsnCode?.trim() || "90212900",
          qty: Number(item.qty) || 0,
          price: Number(item.price) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          discountValue: Number(item.discountValue) || 0,
        })),
        summary: {
          freightCost: Number(formData.summary.freightCost) || 0,
          paidAmount: Number(formData.summary.paidAmount) || 0,
        },
        invoiceDate: new Date(formData.invoiceDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
      };

      // Credit can only be applied to an invoice that still has money due —
      // create it as issued / partially paid; applying the credit then moves
      // it to partially_paid / paid on the server.
      if (creditTotal > 0) {
        payload.status = payload.summary.paidAmount > 0 ? "partially_paid" : "issued";
      }

      // Every invoice belongs to one client: the backend links invoice <-> client and
      // also saves which employee (agent) created it.
      payload.leadId = client._id;

      const res = await invoiceService.create(payload);
      const created = res?.data ?? res;
      const invNum = created?.invoiceNumber || "";
      refetch?.(); // client card par naya invoice dikhe

      if (creditTotal > 0 && created?.invoiceId) {
        const failures = await applyCredits(created.invoiceId, invNum);
        if (failures.length) {
          showToast(
            "error",
            `Invoice ${invNum} created, but some credit wasn't applied — ${failures.join("; ")}`
          );
          setTimeout(() => {
            onSuccess?.();
            onClose?.();
          }, 4000);
          return;
        }
        showToast(
          "success",
          `Invoice ${invNum} created · ₹${creditTotal.toLocaleString("en-IN")} credit applied`
        );
      } else {
        showToast("success", `Invoice ${invNum} created!`);
      }
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1400);
    } catch (err) {
      console.error("Create error:", err);
      showToast("error", err.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  /* ── Prevent body scroll ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div onClick={onClose} className="inv-overlay">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1100,
            background: toast.type === "success" ? "rgba(74,222,128,.15)" : "rgba(239,68,68,.15)",
            border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,.4)" : "rgba(239,68,68,.4)"}`,
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 12,
            fontWeight: 700,
            color: toast.type === "success" ? THEME.green : "#f87171",
            pointerEvents: "none",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div onClick={(event) => event.stopPropagation()} className="inv-modal">
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: `1px solid ${THEME.border}`,
            background: THEME.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: THEME.orangeDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={17} color={THEME.orange} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: THEME.textWhite }}>
                New Tax Invoice
              </div>
              {(client || formData.billTo.companyName) && (
                <div style={{ fontSize: 10, color: THEME.orange }}>
                  {client?.clinicName || client?.doctorName || formData.billTo.companyName}
                  {client?.clientId ? ` · ${client.clientId}` : ""}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: THEME.textDim,
              padding: 6,
              borderRadius: 8,
            }}
            onMouseEnter={(event) => (event.currentTarget.style.color = THEME.red)}
            onMouseLeave={(event) => (event.currentTarget.style.color = THEME.textDim)}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          {/* Client — zaroori */}
          <SectionCard title="Client *" icon={UserCheck}>
            <ClientPicker
              value={client}
              onChange={pickClient}
              locked={clientLocked}
              initialQuery={
                !client ? customerData?.contactNumber || customerData?.companyName || "" : ""
              }
            />
          </SectionCard>

          {/* Dates & status */}
          <SectionCard title="Invoice Meta" icon={Calendar}>
            <div
              className="inv-meta-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}
            >
              {[
                { label: "Invoice Date", key: "invoiceDate", type: "date" },
                { label: "Due Date", key: "dueDate", type: "date" },
                { label: "Delivery Date", key: "deliveryDate", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type={type}
                    value={formData[key]}
                    onChange={(event) => set(key, event.target.value)}
                  />
                </div>
              ))}
              <div>
                <Label>Delivery Method</Label>
                <Input
                  value={formData.termsOfDelivery}
                  onChange={(event) => set("termsOfDelivery", event.target.value)}
                />
              </div>
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(status) => set("status", status)}
                options={[
                  { value: "issued", label: "Issued" },
                  { value: "paid", label: "Paid" },
                  { value: "partially_paid", label: "Partially Paid" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
          </SectionCard>

          {/* Bill To */}
          <SectionCard title="Customer / Bill To" icon={Building2}>
            <div
              className="inv-billto-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <Label>Company / Clinic Name *</Label>
                <Input
                  value={formData.billTo.companyName}
                  onChange={(event) => setBT("companyName", event.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={formData.billTo.gstin}
                  onChange={(event) => setBT("gstin", event.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div style={{ gridColumn: "span 3" }}>
                <Label>Shipping Address *</Label>
                <Textarea
                  value={formData.billTo.address}
                  onChange={(event) => setBT("address", event.target.value)}
                  placeholder="Building, Street, City, State, PIN"
                  rows={2}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={formData.billTo.contactPerson}
                  onChange={(event) => setBT("contactPerson", event.target.value)}
                />
              </div>
              <div>
                <Label>Mobile No.</Label>
                <Input
                  value={formData.billTo.contactNumber}
                  onChange={(event) => setBT("contactNumber", event.target.value)}
                  placeholder="+91"
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(event) => set("paymentTerms", event.target.value)}
                />
              </div>
            </div>

            {/* Check credit */}
            <button
              onClick={handleCheckCredit}
              disabled={creditLoading}
              style={{
                marginTop: 12,
                width: "100%",
                background: "none",
                border: `1px solid ${THEME.borderDim}`,
                borderRadius: 9,
                padding: "9px 0",
                cursor: creditLoading ? "wait" : "pointer",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: THEME.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              {creditLoading ? (
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Wallet size={13} />
              )}
              Check credit
            </button>

            {credit && credit.sources.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  background: "rgba(74,222,128,.06)",
                  border: "1px solid rgba(74,222,128,.3)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: THEME.green }}>
                    ₹{credit.available.toLocaleString("en-IN")} credit available
                  </span>
                  <span style={{ fontSize: 10, color: THEME.textDim }}>
                    Tick what to use on this invoice — it counts as payment
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {credit.sources.map((src) => {
                    const key = sourceKey(src);
                    const on = creditUse[key] !== undefined;
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          background: THEME.bgBase,
                          border: `1px solid ${on ? "rgba(74,222,128,.45)" : THEME.borderDim}`,
                          borderRadius: 8,
                          padding: "8px 10px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleSource(src)}
                          style={{ accentColor: "#16a34a" }}
                        />
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: THEME.textWhite,
                              fontFamily: "monospace",
                            }}
                          >
                            {src.kind === "credit_note"
                              ? src.creditNoteNumber
                              : `Refund on ${src.invoiceNumber}`}
                          </div>
                          <div style={{ fontSize: 10, color: THEME.textDim }}>
                            {src.kind === "credit_note"
                              ? "Credit note"
                              : "Pending refund (becomes a credit note)"}
                            {src.orderDate
                              ? ` · ${new Date(src.orderDate).toLocaleDateString("en-IN")}`
                              : ""}
                            {` · ₹${Number(src.owed).toLocaleString("en-IN")} available`}
                          </div>
                        </div>
                        {on && (
                          <input
                            value={creditUse[key]}
                            onChange={(event) => {
                              const cleanValue = clean(event.target.value);
                              setCreditUse((prevCreditUse) => ({
                                ...prevCreditUse,
                                [key]:
                                  Number(cleanValue) > src.owed ? String(src.owed) : cleanValue,
                              }));
                            }}
                            style={{
                              width: 100,
                              background: THEME.bgCard,
                              border: `1px solid ${THEME.borderDim}`,
                              borderRadius: 8,
                              padding: "6px 9px",
                              fontSize: 12,
                              fontWeight: 800,
                              color: THEME.green,
                              textAlign: "right",
                              outline: "none",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Items */}
          <SectionCard title="Line Items" icon={Package}>
            <p
              style={{ fontSize: 12, color: THEME.textMuted, margin: "0 0 12px", lineHeight: 1.5 }}
            >
              Add one line per product you're billing. Line total = <b>Qty × Price − Discount</b>.
              GST is added automatically when the invoice is created.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {formData.items.map((item, idx) => {
                const gross = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const net = gross - (Number(item.discountValue) || 0);
                return (
                  <div
                    key={idx}
                    style={{
                      background: THEME.bgBase,
                      border: `1px solid ${THEME.borderDim}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    {/* Product header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: THEME.orange }}>
                        Product {idx + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          title="Remove this product"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.textDim,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: 4,
                            transition: "color .2s",
                          }}
                          onMouseEnter={(event) => (event.currentTarget.style.color = THEME.red)}
                          onMouseLeave={(event) =>
                            (event.currentTarget.style.color = THEME.textDim)
                          }
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>

                    {/* Row 1 — description, full width so long names stay readable */}
                    <ItemField
                      label="Product / Description *"
                      hint="Start typing to pick from past products, or enter a new name"
                    >
                      <input
                        type="text"
                        list={`desc-list-${idx}`}
                        value={item.description}
                        onChange={(event) => handleDescriptionChange(idx, event.target.value)}
                        placeholder="e.g. Zirconia Crown – Upper Molar"
                        title={item.description}
                        style={itemInput}
                        onFocus={(event) =>
                          (event.target.style.borderColor = "rgba(230,135,54,.5)")
                        }
                        onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
                      />
                      <datalist id={`desc-list-${idx}`}>
                        {dynamicOptions.descriptions.map((description, index) => (
                          <option key={index} value={description} />
                        ))}
                      </datalist>
                    </ItemField>

                    {/* Row 2 — numbers */}
                    <div
                      className="inv-item-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: 12,
                        marginTop: 12,
                        alignItems: "start",
                      }}
                    >
                      <ItemField label="HSN Code" hint="Tax code of the product">
                        <input
                          value={item.hsnCode}
                          onChange={(event) => setItem(idx, "hsnCode", event.target.value)}
                          placeholder="e.g. 90212900"
                          style={itemInput}
                        />
                      </ItemField>
                      <ItemField label="Quantity *" hint="Number of units">
                        <input
                          list={`qty-list-${idx}`}
                          value={item.qty}
                          inputMode="decimal"
                          onChange={(event) => setItem(idx, "qty", event.target.value)}
                          placeholder="e.g. 2"
                          style={itemInput}
                        />
                        <datalist id={`qty-list-${idx}`}>
                          {dynamicOptions.quantities.map((quantity) => (
                            <option key={quantity} value={quantity} />
                          ))}
                        </datalist>
                      </ItemField>
                      <ItemField label="Price per unit (₹) *" hint="Before GST">
                        <input
                          list={`price-list-${idx}`}
                          value={item.price}
                          inputMode="decimal"
                          onChange={(event) => setItem(idx, "price", event.target.value)}
                          placeholder="e.g. 1500"
                          style={itemInput}
                        />
                        <datalist id={`price-list-${idx}`}>
                          {dynamicOptions.prices.map((price) => (
                            <option key={price} value={price} />
                          ))}
                        </datalist>
                      </ItemField>
                      <ItemField label="Discount %" hint="Fills ₹ discount for you">
                        <input
                          value={item.discountPercent}
                          inputMode="decimal"
                          onChange={(event) => setItem(idx, "discountPercent", event.target.value)}
                          placeholder="0"
                          style={itemInput}
                        />
                      </ItemField>
                      <ItemField label="Discount (₹)" hint="Or enter the amount off">
                        <input
                          value={item.discountValue}
                          inputMode="decimal"
                          onChange={(event) => setItem(idx, "discountValue", event.target.value)}
                          placeholder="0"
                          style={itemInput}
                        />
                      </ItemField>
                      <ItemField
                        label="Line total"
                        hint={
                          gross > 0
                            ? `₹${gross.toLocaleString("en-IN")} − discount`
                            : "Auto-calculated"
                        }
                      >
                        <div
                          style={{
                            ...itemInput,
                            background: THEME.orangeDim,
                            border: `1px solid rgba(230,135,54,.25)`,
                            fontWeight: 800,
                            color: THEME.orange,
                          }}
                        >
                          ₹{net.toLocaleString("en-IN")}
                        </div>
                      </ItemField>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addItem}
              style={{
                marginTop: 12,
                width: "100%",
                background: "none",
                border: `1px dashed ${THEME.borderDim}`,
                borderRadius: 10,
                padding: "11px 0",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: THEME.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all .2s",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = THEME.orange;
                event.currentTarget.style.color = THEME.orange;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = THEME.borderDim;
                event.currentTarget.style.color = THEME.textMuted;
              }}
            >
              <Plus size={14} /> Add Another Product
            </button>
          </SectionCard>

          {/* Freight & Paid */}
          <div
            className="inv-billto-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              {
                label: "Freight / Shipping (₹)",
                key: "freightCost",
                color: THEME.textWhite,
                hint: "Courier / delivery charge added to the bill",
              },
              {
                label: "Amount Paid (₹)",
                key: "paidAmount",
                color: THEME.green,
                hint: "Money already received from the customer",
              },
            ].map(({ label, key, color, hint }) => (
              <div
                key={key}
                style={{
                  background: THEME.bgCard,
                  border: `1px solid ${THEME.borderDim}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>{hint}</div>
                </div>
                <input
                  value={formData.summary[key]}
                  inputMode="decimal"
                  onChange={(event) =>
                    setFormData((prevFormData) => ({
                      ...prevFormData,
                      summary: { ...prevFormData.summary, [key]: clean(event.target.value) },
                    }))
                  }
                  placeholder="0"
                  style={{
                    width: 140,
                    background: THEME.bgBase,
                    border: `1px solid ${THEME.borderDim}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 14,
                    fontWeight: 800,
                    color,
                    textAlign: "right",
                    outline: "none",
                  }}
                  onFocus={(event) => (event.target.style.borderColor = "rgba(230,135,54,.5)")}
                  onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
                />
              </div>
            ))}
          </div>

          {/* Totals incl. credit */}
          <div
            style={{
              marginTop: 12,
              background: THEME.bgCard,
              border: `1px solid ${THEME.borderDim}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", color: THEME.textMuted }}
            >
              <span>Grand total (estimate)</span>
              <strong style={{ color: THEME.textWhite }}>
                ₹{grandTotal.toLocaleString("en-IN")}
              </strong>
            </div>
            {creditTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: THEME.green }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={13} /> Credit applied
                </span>
                <strong>− ₹{creditTotal.toLocaleString("en-IN")}</strong>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: THEME.textMuted,
                borderTop: `1px solid ${THEME.borderDim}`,
                paddingTop: 6,
              }}
            >
              <span>Balance due</span>
              <strong style={{ color: creditTooMuch ? THEME.red : THEME.orange }}>
                ₹
                {roundToPaise(
                  Math.max(grandTotal - (Number(formData.summary.paidAmount) || 0) - creditTotal, 0)
                ).toLocaleString("en-IN")}
              </strong>
            </div>
            {creditTooMuch && (
              <div style={{ fontSize: 10.5, color: THEME.red }}>
                Credit is more than what's left to pay — reduce it.
              </div>
            )}
            {creditTotal > 0 && (
              <div style={{ fontSize: 10, color: THEME.textGhost }}>
                Status is set automatically from payment + credit.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${THEME.border}`,
            background: THEME.bgCard,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, color: client ? THEME.textGhost : "#f87171" }}>
            {client
              ? "* GST / IGST and grand total are calculated server-side"
              : "Select a client above to continue"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${THEME.borderDim}`,
                borderRadius: 9,
                padding: "9px 20px",
                fontSize: 12,
                fontWeight: 700,
                color: THEME.textMuted,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !client}
              title={client ? "" : "Select a client first"}
              style={{
                background: THEME.orange,
                border: "none",
                borderRadius: 9,
                padding: "9px 24px",
                fontSize: 12,
                fontWeight: 800,
                color: "#fff",
                cursor: loading || !client ? "not-allowed" : "pointer",
                opacity: loading || !client ? 0.55 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…
                </>
              ) : (
                <>
                  <Send size={14} /> Finalize & Create
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
