/**
 * Modal form to edit an existing invoice; backend errors are shown in an alert.
 *
 * Backend errors are shown as a SweetAlert card (the user clicks OK).
 *
 * Used by: pages/ClientProfilePage.jsx, pages/InvoiceListPage.jsx
 * API: invoiceService.update
 */

import React, { useState } from "react";
import Swal from "sweetalert2";
import { invoiceService } from "../../backend/ApiService.js";
import {
  X as CloseIcon,
  Building2,
  Truck,
  FileText,
  ShoppingBag,
  Calculator,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { THEME } from "../../constants/InvoiceFormTheme.js";
import { Label } from "./Label.jsx";
import { SectionCard } from "./SectionCard.jsx";

const Input = ({ value, onChange, placeholder, style = {} }) => (
  <input
    value={value}
    onChange={onChange}
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
      transition: "border-color .2s",
      ...style,
    }}
    onFocus={(event) => (event.target.style.borderColor = "rgba(230,135,54,.5)")}
    onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
  />
);

const Textarea = ({ value, onChange, rows = 3 }) => (
  <textarea
    value={value}
    onChange={onChange}
    rows={rows}
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

/* ── Helpers ── */
const clean = (value) => String(value ?? "").replace(/[^0-9.]/g, "");
const toDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");

/* Backend messages -> clear English for the alert card */
const friendlyError = (err) => {
  const raw = String(err?.response?.data?.message || err?.message || "");
  if (/order se aate hain|order mein edit|items come from its order/i.test(raw)) {
    return {
      title: "Items can't be edited here",
      text: "This invoice's items come from an order. Please edit them in the order instead.",
    };
  }
  return {
    title: "Update failed",
    text: raw || "Something went wrong. Please try again.",
  };
};

export default function UpdateInvoiceModal({ invoice, onClose, onRefresh }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", msg }

  const [formData, setFormData] = useState({
    status: invoice.status || "issued",
    paymentTerms: invoice.paymentTerms || "",
    termsOfDelivery: invoice.termsOfDelivery || "",
    shippingCondition: invoice.shippingCondition || "",
    customerServiceRep: invoice.customerServiceRep || "",
    notes: invoice.notes || "",
    invoiceDate: toDate(invoice.invoiceDate),
    orderDate: toDate(invoice.orderDate),
    deliveryDate: toDate(invoice.deliveryDate),
    billTo: {
      companyName: invoice.billTo?.companyName || "",
      address: invoice.billTo?.address || "",
      gstin: invoice.billTo?.gstin || "",
      contactPerson: invoice.billTo?.contactPerson || "",
      contactNumber: invoice.billTo?.contactNumber || "",
    },
    items: (invoice.items?.length > 0 ? invoice.items : [{}]).map((item) => ({
      description: item.description || "",
      qty: String(item.qty ?? 1),
      price: String(item.price ?? 0),
      discountPercent: String(item.discountPercent ?? 0),
      discountValue: String(item.discountValue ?? 0),
    })),
    summary: {
      freightCost: String(invoice.summary?.freightCost ?? 0),
      paidAmount: String(invoice.summary?.paidAmount ?? 0),
    },
    permission: "sales.invoice.update",
  });

  /* ── Field helpers ── */
  const set = (key, val) => setFormData((prevFormData) => ({ ...prevFormData, [key]: val }));
  const setBillTo = (key, val) =>
    setFormData((prevFormData) => ({
      ...prevFormData,
      billTo: { ...prevFormData.billTo, [key]: val },
    }));
  const setSummary = (key, val) =>
    setFormData((prevFormData) => ({
      ...prevFormData,
      summary: { ...prevFormData.summary, [key]: clean(val) },
    }));

  const setItem = (idx, key, val) => {
    const items = [...formData.items];
    if (key === "description") {
      items[idx][key] = val;
    } else {
      const cleanValue = clean(val);
      items[idx][key] = cleanValue;
      const qty = Number(key === "qty" ? cleanValue : items[idx].qty) || 0;
      const price = Number(key === "price" ? cleanValue : items[idx].price) || 0;
      const gross = qty * price;
      if (key === "discountPercent") {
        items[idx].discountValue = String((gross * Number(cleanValue)) / 100);
      } else if (key === "discountValue") {
        items[idx].discountPercent = gross > 0 ? String((Number(cleanValue) / gross) * 100) : "0";
      } else {
        const pct = Number(items[idx].discountPercent) || 0;
        items[idx].discountValue = String((gross * pct) / 100);
      }
    }
    setFormData((prevFormData) => ({ ...prevFormData, items }));
  };

  const addItem = () =>
    setFormData((prevFormData) => ({
      ...prevFormData,
      items: [
        ...prevFormData.items,
        { description: "", qty: "1", price: "0", discountPercent: "0", discountValue: "0" },
      ],
    }));

  const removeItem = (idx) => {
    if (formData.items.length <= 1) {
      showToast("error", "At least one item required");
      return;
    }
    setFormData((prevFormData) => ({
      ...prevFormData,
      items: prevFormData.items.filter((_, index) => index !== idx),
    }));
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: formData.items.map((item) => ({
          ...item,
          qty: Number(item.qty) || 0,
          price: Number(item.price) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          discountValue: Number(item.discountValue) || 0,
        })),
        summary: {
          freightCost: Number(formData.summary.freightCost) || 0,
          paidAmount: Number(formData.summary.paidAmount) || 0,
        },
      };
      await invoiceService.update(invoice.invoiceId || invoice._id, payload);
      showToast("success", "Invoice updated successfully");
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Update error:", err);
      const { title, text } = friendlyError(err);
      await Swal.fire({
        icon: "warning",
        title,
        text,
        confirmButtonText: "OK",
        confirmButtonColor: "#ea580c",
        // the modal overlay uses zIndex 1000 – keep the alert above it
        customClass: { container: "swal-above-modal" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Grid helper ── */
  const Grid = ({ cols = "1fr 1fr", children, gap = 12 }) => (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap, marginBottom: 12 }}>
      {children}
    </div>
  );

  const Field = ({ label, children, span }) => (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <Label>{label}</Label>
      {children}
    </div>
  );

  /* ── Prevent body scroll ── */
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
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
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: THEME.bgSurface,
          border: `1px solid ${THEME.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 780,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: `1px solid ${THEME.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: THEME.bgCard,
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
                Update Invoice
              </div>
              <div style={{ fontSize: 10, color: THEME.orange }}>{invoice.invoiceNumber}</div>
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

        {/* Scrollable body */}
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          {/* 1. Customer */}
          <SectionCard title="Customer Information" icon={Building2}>
            <Grid cols="1fr 1fr 1fr">
              <Field label="Company Name" span={2}>
                <Input
                  value={formData.billTo.companyName}
                  onChange={(event) => setBillTo("companyName", event.target.value)}
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  value={formData.billTo.gstin}
                  onChange={(event) => setBillTo("gstin", event.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  style={{ textTransform: "uppercase" }}
                />
              </Field>
            </Grid>
            <Grid cols="1fr 1fr 1fr">
              <Field label="Address" span={3}>
                <Textarea
                  value={formData.billTo.address}
                  onChange={(event) => setBillTo("address", event.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Contact Person">
                <Input
                  value={formData.billTo.contactPerson}
                  onChange={(event) => setBillTo("contactPerson", event.target.value)}
                />
              </Field>
              <Field label="Contact Number">
                <Input
                  value={formData.billTo.contactNumber}
                  onChange={(event) => setBillTo("contactNumber", event.target.value)}
                />
              </Field>
            </Grid>
          </SectionCard>

          {/* 2. Logistics */}
          <SectionCard title="Timeline & Logistics" icon={Truck}>
            <Grid cols="1fr 1fr 1fr" gap={12}>
              <Field label="Invoice Date">
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(event) => set("invoiceDate", event.target.value)}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
              <Field label="Order Date">
                <Input
                  type="date"
                  value={formData.orderDate}
                  onChange={(event) => set("orderDate", event.target.value)}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
              <Field label="Delivery Date">
                <Input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(event) => set("deliveryDate", event.target.value)}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
            </Grid>
            <Grid cols="1fr 1fr 1fr 1fr" gap={12}>
              <Field label="Delivery Terms">
                <Input
                  value={formData.termsOfDelivery}
                  onChange={(event) => set("termsOfDelivery", event.target.value)}
                />
              </Field>
              <Field label="Shipping">
                <Input
                  value={formData.shippingCondition}
                  onChange={(event) => set("shippingCondition", event.target.value)}
                />
              </Field>
              <Field label="Service Rep">
                <Input
                  value={formData.customerServiceRep}
                  onChange={(event) => set("customerServiceRep", event.target.value)}
                />
              </Field>
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
            </Grid>
          </SectionCard>

          {/* 3. Line items */}
          <SectionCard title="Line Items" icon={ShoppingBag}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {formData.items.map((item, idx) => {
                const gross = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const net = gross - (Number(item.discountValue) || 0);
                return (
                  <div
                    key={idx}
                    style={{
                      background: THEME.bgBase,
                      border: `1px solid ${THEME.borderDim}`,
                      borderRadius: 10,
                      padding: 14,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 60px 100px 70px 100px 100px 32px",
                        gap: 8,
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(event) => setItem(idx, "description", event.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Qty</Label>
                        <Input
                          value={item.qty}
                          onChange={(event) => setItem(idx, "qty", event.target.value)}
                          style={{ textAlign: "center" }}
                        />
                      </div>
                      <div>
                        <Label>Price (₹)</Label>
                        <Input
                          value={item.price}
                          onChange={(event) => setItem(idx, "price", event.target.value)}
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div>
                        <Label>Disc %</Label>
                        <Input
                          value={item.discountPercent}
                          onChange={(event) => setItem(idx, "discountPercent", event.target.value)}
                          style={{ textAlign: "center" }}
                        />
                      </div>
                      <div>
                        <Label>Disc Amt (₹)</Label>
                        <Input
                          value={item.discountValue}
                          onChange={(event) => setItem(idx, "discountValue", event.target.value)}
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <div
                          style={{
                            background: THEME.orangeDim,
                            border: `1px solid rgba(230,135,54,.25)`,
                            borderRadius: 8,
                            padding: "8px 11px",
                            fontSize: 12,
                            fontWeight: 800,
                            color: THEME.orange,
                            textAlign: "right",
                          }}
                        >
                          ₹{net.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.textGhost,
                            padding: "8px 4px",
                            borderRadius: 6,
                            transition: "color .2s",
                          }}
                          onMouseEnter={(event) => (event.currentTarget.style.color = THEME.red)}
                          onMouseLeave={(event) =>
                            (event.currentTarget.style.color = THEME.textGhost)
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addItem}
              style={{
                marginTop: 10,
                width: "100%",
                background: "none",
                border: `1px dashed ${THEME.borderDim}`,
                borderRadius: 9,
                padding: "9px 0",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.textGhost,
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
                event.currentTarget.style.color = THEME.textGhost;
              }}
            >
              <Plus size={13} /> Add Line Item
            </button>
          </SectionCard>

          {/* 4. Summary */}
          <SectionCard title="Summary & Payment" icon={Calculator}>
            <Grid cols="1fr 1fr" gap={12}>
              <div>
                <Field label="Payment Terms">
                  <Input
                    value={formData.paymentTerms}
                    onChange={(event) => set("paymentTerms", event.target.value)}
                  />
                </Field>
                <div style={{ marginTop: 10 }}>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(event) => set("notes", event.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div
                style={{
                  background: THEME.bgBase,
                  border: `1px solid ${THEME.borderDim}`,
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {[
                  { label: "Freight Cost (₹)", key: "freightCost" },
                  { label: "Amount Paid (₹)", key: "paidAmount" },
                ].map(({ label, key }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                      {label}
                    </span>
                    <input
                      value={formData.summary[key]}
                      onChange={(event) => setSummary(key, event.target.value)}
                      style={{
                        width: 120,
                        background: THEME.bgCard,
                        border: `1px solid ${THEME.borderDim}`,
                        borderRadius: 8,
                        padding: "7px 10px",
                        fontSize: 13,
                        fontWeight: 800,
                        color: key === "paidAmount" ? THEME.green : THEME.textWhite,
                        textAlign: "right",
                        outline: "none",
                      }}
                      onFocus={(event) => (event.target.style.borderColor = "rgba(230,135,54,.5)")}
                      onBlur={(event) => (event.target.style.borderColor = THEME.borderDim)}
                    />
                  </div>
                ))}
              </div>
            </Grid>
          </SectionCard>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${THEME.border}`,
            background: THEME.bgCard,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexShrink: 0,
          }}
        >
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
            disabled={isSubmitting}
            style={{
              background: THEME.orange,
              border: "none",
              borderRadius: 9,
              padding: "9px 24px",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Updating…
              </>
            ) : (
              "Update Invoice"
            )}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .swal-above-modal{z-index:2000 !important;}
      `}</style>
    </div>
  );
}
