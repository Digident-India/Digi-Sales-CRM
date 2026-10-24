/**
 * Modal to settle the refund owed on an invoice as store credit or an actual payout.
 *
 * Used by: pages/ClientProfilePage.jsx, pages/InvoiceListPage.jsx
 * API: invoiceService.settleRefund
 */

import { useState } from "react";
import { invoiceService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";

const METHODS = [
  { value: "credit_note", label: "Credit note (store credit)" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

/**
 * Settles part or all of an invoice's pending refund — either a real
 * payout, or store credit ("customer will take it next time", the
 * "credit note" option). This is the only way a refund_pending /
 * partial_refunded invoice moves toward "refunded".
 *
 * Props:
 *  - invoice: the invoice this refund is owed on (needs refundableAmount)
 *  - onClose(): close without saving
 *  - onDone(): settlement saved — caller refetches + closes
 */
export default function SettleInvoiceCreditModal({ invoice, onClose, onDone }) {
  const owed = Number(invoice.refundableAmount || 0);

  const [amount, setAmount] = useState(owed ? String(owed) : "");
  const [method, setMethod] = useState("credit_note");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const amountNum = Number(amount);
  const canSave = amountNum > 0 && amountNum <= owed + 0.01 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await invoiceService.settleRefund(invoice.invoiceId || invoice._id, {
        amount: amountNum,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      // When settled as store credit the response carries the new credit note
      onDone?.(res?.data ?? res);
    } catch (error) {
      showError(error.message || "Couldn't settle this refund");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--bg-card, #1a1a1a)",
          border: "1px solid var(--yellow-ring, #663)",
          borderRadius: 12,
          padding: 24,
          width: "min(92vw, 420px)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 4, color: "var(--text-white)" }}>💳 Settle refund</h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 12, color: "var(--text-dim)" }}>
          {invoice.invoiceNumber} owes{" "}
          <strong style={{ color: "var(--yellow)" }}>₹{owed.toLocaleString("en-IN")}</strong> back
          to this customer. Settle it as store credit or an actual payout.
        </p>

        <label
          style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}
        >
          Amount (max ₹{owed.toLocaleString("en-IN")})
        </label>
        <input
          type="number"
          className="input"
          value={amount}
          min={0}
          max={owed}
          step="0.01"
          onChange={(event) => setAmount(event.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label
          style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}
        >
          Method
        </label>
        <select
          className="input"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          style={{ marginBottom: 14 }}
        >
          {METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>

        {method !== "credit_note" && (
          <>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 4,
              }}
            >
              Reference (optional)
            </label>
            <input
              className="input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="UTR / transaction id…"
              style={{ marginBottom: 14 }}
            />
          </>
        )}

        <label
          style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}
        >
          Notes (optional)
        </label>
        <textarea
          className="input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          style={{ marginBottom: 20, resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            disabled={!canSave}
            onClick={handleSave}
            style={{
              background: canSave ? "var(--yellow-dim, #442)" : "var(--bg-card)",
              border: "1px solid var(--yellow-ring, #663)",
              color: canSave ? "var(--yellow, #eab308)" : "var(--text-ghost, #555)",
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Settling…" : "Settle refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
