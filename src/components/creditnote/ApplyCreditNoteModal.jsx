/**
 * Modal to use a credit note's balance to pay one of the same customer's unpaid invoices.
 *
 * API: creditNoteService.applyToInvoice, creditNoteService.getApplyTargets
 */

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { creditNoteService } from "../../backend/ApiService.js";
import { showError } from "../ui/Alert";
import { CnModal, FieldLabel, PrimaryBtn, GhostBtn } from "./CreditNoteUi.jsx";
import { fmtINR, fmtDate, unwrap, round2 } from "../../utils/CreditNoteHelpers.js";
import { CnSummaryStrip } from "./CnSummaryStrip.jsx";

/* ════════════════════════════════════════════════════════════════════
   APPLY TO AN EXISTING INVOICE
════════════════════════════════════════════════════════════════════ */
export function ApplyCreditNoteModal({ cn, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [picked, setPicked] = useState(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = unwrap(await creditNoteService.getApplyTargets(cn.creditNoteId));
        if (!alive) return;
        const list = data?.invoices || [];
        setTargets(list);
        if (list.length === 1) choose(list[0]);
      } catch (error) {
        if (alive) setLoadErr(error.message || "Couldn't load invoices");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cn.creditNoteId]);

  function choose(invoice) {
    setPicked(invoice);
    setAmount(String(round2(Math.min(Number(cn.balance || 0), Number(invoice.due || 0)))));
  }

  const amt = Number(amount);
  const max = picked ? Math.min(Number(cn.balance || 0), Number(picked.due || 0)) : 0;
  const canSave = !!picked && amt > 0 && amt <= max + 0.01 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await creditNoteService.applyToInvoice(cn.creditNoteId, {
        invoiceId: picked.invoiceId,
        amount: round2(amt),
      });
      onDone?.(unwrap(res));
    } catch (error) {
      showError(error.message || "Couldn't apply the credit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CnModal
      title="Use credit on an invoice"
      subtitle="Counts as payment on the invoice you pick"
      icon={ArrowRightLeft}
      width={600}
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={onClose} disabled={saving}>
            Cancel
          </GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={!canSave} color="#16a34a">
            {saving ? (
              <>
                <Loader2 size={14} className="cn-spin" /> Applying…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Apply {amt > 0 ? fmtINR(amt) : ""}
              </>
            )}
          </PrimaryBtn>
        </>
      }
    >
      <CnSummaryStrip cn={cn} />

      <FieldLabel>Unpaid invoices for {cn.billTo?.contactNumber || "this customer"}</FieldLabel>
      {loading ? (
        <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
          Loading invoices…
        </div>
      ) : loadErr ? (
        <div style={{ padding: 14, fontSize: 12, color: "var(--red)" }}>{loadErr}</div>
      ) : targets.length === 0 ? (
        <div
          style={{
            padding: "22px 16px",
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-dim)",
            border: "1px dashed var(--border-mid)",
            borderRadius: 10,
          }}
        >
          This customer has no unpaid invoices right now.
          <br />
          <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>
            The credit stays open — use "Check credit" when creating their next invoice, or pay it
            back.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {targets.map((target) => {
            const active = picked?.invoiceId === target.invoiceId;
            return (
              <button
                key={target.invoiceId}
                onClick={() => choose(target)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                  background: active ? "rgba(22,163,74,.08)" : "var(--bg-base)",
                  border: `1px solid ${active ? "rgba(22,163,74,.5)" : "var(--border-dim)"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${active ? "#16a34a" : "var(--border-mid)"}`,
                    background: active ? "radial-gradient(#16a34a 45%, transparent 50%)" : "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 900,
                    color: "#ea580c",
                    fontSize: 12,
                    minWidth: 64,
                  }}
                >
                  {target.invoiceNumber}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: "var(--text-dim)" }}>
                  {fmtDate(target.invoiceDate)} · total {fmtINR(target.total)} · paid{" "}
                  {fmtINR(target.paid)}
                </span>
                <span style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 9,
                      color: "var(--text-ghost)",
                      textTransform: "uppercase",
                    }}
                  >
                    Due
                  </span>
                  <span style={{ fontWeight: 900, color: "var(--red)", fontSize: 13 }}>
                    {fmtINR(target.due)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {picked && (
        <div>
          <FieldLabel hint={`max ${fmtINR(max)}`}>Amount to apply (₹)</FieldLabel>
          <input
            className="input"
            type="number"
            min={0}
            max={max}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ fontSize: 15, fontWeight: 800 }}
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
            After this: {picked.invoiceNumber} due{" "}
            <strong style={{ color: "var(--text-white)" }}>
              {fmtINR(Math.max(picked.due - (amt || 0), 0))}
            </strong>
            {" · "}credit left{" "}
            <strong style={{ color: "#4ade80" }}>
              {fmtINR(Math.max(cn.balance - (amt || 0), 0))}
            </strong>
          </div>
        </div>
      )}
    </CnModal>
  );
}
