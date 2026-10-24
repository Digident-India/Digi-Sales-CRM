/**
 * Modal to record items returned on an invoice and whether the money was already refunded.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/InvoiceListPage.jsx
 * API: invoiceService.recordReturn
 */

import { useState, useMemo } from "react";
import { Undo2, X as CloseIcon } from "lucide-react";
import { invoiceService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";

// Immediate payout methods only — a return left "not refunded" is exactly
// what later becomes a credit-note settlement on this invoice.
const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const inr = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const field = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  fontSize: 15,
  border: "1px solid var(--border)",
  background: "var(--input-bg)",
  color: "var(--text-white)",
  outline: "none",
  fontFamily: "inherit",
};
const checkbox = {
  width: 20,
  height: 20,
  accentColor: "#f59e0b",
  cursor: "pointer",
  flexShrink: 0,
};

/**
 * Records a return directly on a STANDALONE invoice (no source order) —
 * pick which items/quantities came back, then either mark it refunded or
 * leave it pending for "Settle refund" (as store credit / credit note) later.
 *
 * Props:
 *  - invoice: the invoice to record the return against
 *  - onClose(): close without saving
 *  - onDone(): return saved — caller refetches + closes
 */
export default function RecordInvoiceReturnModal({ invoice, onClose, onDone }) {
  const items = invoice.items || [];
  const remainingOf = (item) => Math.max(0, (item.qty || 0) - (item.returnedQty || 0));

  // { [itemId]: { checked, qty } } — qty defaults to everything still returnable
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      items.map((item) => [item.itemId, { checked: false, qty: String(remainingOf(item) || "") }])
    )
  );
  const [refundNow, setRefundNow] = useState(false);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const setRow = (itemId, patch) =>
    setRows((prevRows) => ({ ...prevRows, [itemId]: { ...prevRows[itemId], ...patch } }));

  const selected = items
    .map((item) => ({ item: item, row: rows[item.itemId] }))
    .filter(({ row }) => row?.checked && Number(row.qty) > 0);

  const refundAmount = useMemo(
    () =>
      selected.reduce((sum, { item, row }) => {
        const perUnit = item.qty ? (item.totalAmount || 0) / item.qty : 0;
        return sum + perUnit * Number(row.qty || 0);
      }, 0),
    [selected]
  );

  const allQtyValid = selected.every(({ item, row }) => Number(row.qty) <= remainingOf(item));
  const canSave = selected.length > 0 && allQtyValid && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const reason = notes.trim() || undefined;
      await invoiceService.recordReturn(invoice.invoiceId || invoice._id, {
        returnItems: selected.map(({ item, row }) => ({
          itemId: item.itemId,
          quantity: Number(row.qty),
          reason,
        })),
        refundNow,
        refundMethod: refundNow ? method : undefined,
        reference: refundNow ? reference.trim() || undefined : undefined,
        notes: reason,
      });
      onDone?.();
    } catch (error) {
      showError(error.message || "Couldn't record this return");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, padding: 16 }} onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          borderRadius: 24,
          padding: "36px 36px 32px",
          width: "min(94vw, 770px)",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 26 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              flexShrink: 0,
              background: "rgba(245,158,11,.18)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Undo2 size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-white)" }}>
              Record return
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 15, color: "var(--text-muted)" }}>
              #{String(invoice.invoiceNumber || "").replace(/^#+/, "")}
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              padding: 4,
            }}
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {items.map((item) => {
            const remaining = remainingOf(item);
            const row = rows[item.itemId] || {};
            const disabled = remaining <= 0;
            const over = row.checked && Number(row.qty) > remaining;
            return (
              <label
                key={item.itemId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 18px",
                  border: `1px solid ${row.checked ? "rgba(245,158,11,.55)" : "var(--border)"}`,
                  borderRadius: 14,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  transition: "border-color .15s",
                }}
              >
                <input
                  type="checkbox"
                  style={checkbox}
                  disabled={disabled}
                  checked={!!row.checked}
                  onChange={(event) => setRow(item.itemId, { checked: event.target.checked })}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, color: "var(--text-white)", fontWeight: 500 }}>
                    {item.description}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: over ? "#e11d48" : "var(--text-muted)",
                      marginTop: 3,
                    }}
                  >
                    {inr(item.price)} ·{" "}
                    {disabled ? "fully returned" : `${remaining} available to return`}
                  </div>
                </div>
                {!disabled && (
                  <input
                    type="number"
                    min={1}
                    max={remaining}
                    value={row.qty}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setRow(item.itemId, { qty: event.target.value, checked: true })
                    }
                    style={{
                      ...field,
                      width: 96,
                      background: "var(--bg-card)",
                      borderColor: over ? "#e11d48" : "var(--border)",
                    }}
                  />
                )}
              </label>
            );
          })}
        </div>

        <p
          style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.55, color: "var(--text-muted)" }}
        >
          Recording the return doesn't pay anything back by itself — this invoice will show as{" "}
          <strong style={{ color: "var(--text-light)" }}>refund pending</strong> until you actually
          hand the money back and tick this.
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 17,
            color: "var(--text-light)",
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            style={checkbox}
            checked={refundNow}
            onChange={(event) => setRefundNow(event.target.checked)}
          />
          I've already refunded this to the customer
        </label>

        {refundNow && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              style={{ ...field, flex: "1 1 160px", width: "auto" }}
            >
              {REFUND_METHODS.map((refundMethod) => (
                <option key={refundMethod.value} value={refundMethod.value}>
                  {refundMethod.label}
                </option>
              ))}
            </select>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Reference — UTR / transaction id (optional)"
              style={{ ...field, flex: "2 1 240px", width: "auto" }}
            />
          </div>
        )}

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Return reason / notes"
          rows={3}
          style={{ ...field, resize: "vertical", marginBottom: 30, fontSize: 16 }}
        />

        {/* Refund amount */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-card)",
            borderRadius: 14,
            padding: "22px 22px",
            marginBottom: 30,
          }}
        >
          <span style={{ fontSize: 17, color: "var(--text-light)" }}>Refund amount</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-white)" }}>
            {inr(refundAmount)}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "13px 24px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              background: "var(--bg-surface)",
              color: "var(--text-white)",
              border: "1px solid var(--border)",
            }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "13px 24px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              background: "#f59e0b",
              color: canSave ? "#fff" : "rgba(80,60,20,.7)",
              opacity: canSave ? 1 : 0.55,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving…" : "Confirm return"}
          </button>
        </div>
      </div>
    </div>
  );
}
