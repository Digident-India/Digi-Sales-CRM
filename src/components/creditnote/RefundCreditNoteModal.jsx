/**
 * Modal to pay a credit note's balance back to the customer (cash, UPI, bank ...).
 *
 * API: creditNoteService.refund
 */

import { useState } from "react";
import { Wallet, Loader2, Banknote } from "lucide-react";
import { creditNoteService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";
import { CnModal, FieldLabel, PrimaryBtn, GhostBtn } from "./CreditNoteUi.jsx";
import { fmtINR, unwrap, REFUND_METHODS, round2 } from "../../utils/CreditNoteHelpers.js";
import { CnSummaryStrip } from "./CnSummaryStrip.jsx";

/* ════════════════════════════════════════════════════════════════════
   PAY BACK
════════════════════════════════════════════════════════════════════ */
export function RefundCreditNoteModal({ cn, onClose, onDone }) {
  const bal = Number(cn.balance || 0);
  const [amount, setAmount] = useState(String(bal));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const amt = Number(amount);
  const canSave = amt > 0 && amt <= bal + 0.01 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await creditNoteService.refund(cn.creditNoteId, {
        amount: round2(amt),
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onDone?.(unwrap(res));
    } catch (error) {
      showError(error.message || "Couldn't record the payout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CnModal
      title="Pay back credit"
      subtitle="Customer gets the money instead of store credit"
      icon={Wallet}
      accent="#eab308"
      width={480}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} disabled={saving}>
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={!canSave} color="#ca8a04">
            {saving ? (
              <>
                <Loader2 size={14} className="cn-spin" /> Saving…
              </>
            ) : (
              <>
                <Banknote size={14} /> Pay back {amt > 0 ? fmtINR(amt) : ""}
              </>
            )}
          </PrimaryBtn>
        </>
      }
    >
      <CnSummaryStrip cn={cn} />
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <FieldLabel hint={`max ${fmtINR(bal)}`}>Amount (₹)</FieldLabel>
          <input
            className="input"
            type="number"
            min={0}
            max={bal}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ fontSize: 15, fontWeight: 800 }}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}
          className="cn-grid-2"
        >
          <div>
            <FieldLabel>Method</FieldLabel>
            <select
              className="input"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {REFUND_METHODS.map((refundMethod) => (
                <option key={refundMethod.value} value={refundMethod.value}>
                  {refundMethod.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Reference</FieldLabel>
            <input
              className="input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="UTR / transaction id…"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>
    </CnModal>
  );
}
