/**
 * Modal to confirm the client's details and convert a follow-up lead into a client. Also exports
 * the list of Indian states.
 *
 * Used by: components/client/CreateClientModal.jsx, pages/FollowupsPage.jsx
 * API: leadsApi.update
 */

import { useState, useEffect } from "react";
import { X as CloseIcon, UserCheck, Loader2, CheckCircle2 } from "lucide-react";
import { useCrm } from "../../context/CrmContext";
import { leadsApi } from "../../backend/ApiService.js"; // ← added

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli & Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/* ── Shared field wrapper ── */
const Field = ({ label, error, children }) => (
  <div>
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: ".1em",
        marginBottom: 5,
      }}
    >
      {label} *
    </div>
    {children}
    {error && <div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>{error}</div>}
  </div>
);

const inputBase = (hasError) => ({
  width: "100%",
  boxSizing: "border-box",
  background: "var(--input-bg)",
  border: `1px solid ${hasError ? "#f87171" : "var(--border-dim)"}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-light)",
  outline: "none",
  transition: "border-color .2s",
});

/* ── Small step indicator shown during submission ── */
const Step = ({ done, active, label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      opacity: done || active ? 1 : 0.3,
      transition: "opacity .3s",
    }}
  >
    {done ? (
      <CheckCircle2 size={14} color="#4ade80" />
    ) : active ? (
      <Loader2 size={14} color="#facc15" style={{ animation: "spin 1s linear infinite" }} />
    ) : (
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1.5px solid var(--border-dim)",
        }}
      />
    )}
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: done ? "#4ade80" : active ? "#facc15" : "var(--text-dim)",
      }}
    >
      {label}
    </span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function ConvertToClientModal({ lead, onClose, onSuccess }) {
  const { pushToClient } = useCrm();

  const [form, setForm] = useState({
    doctorName: lead?.doctorName || "",
    clinicName: lead?.clinicName || "",
    address: lead?.address || "",
    state: lead?.state || "",
    city: lead?.city || "",
    contact: lead?.contact || "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  /*
   * step:
   *   null  → idle
   *   1     → PUT /leads/:id running
   *   2     → PATCH /leads/:id/convert-to-client running
   *   "done"→ both done
   */
  const [step, setStep] = useState(null);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const set = (field, value) => {
    setForm((prevForm) => ({ ...prevForm, [field]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [field]: undefined }));
  };

  /* ── Validation ── */
  const validate = () => {
    const errors = {};
    if (!form.doctorName.trim()) errors.doctorName = "Person name is required";
    if (!form.clinicName.trim()) errors.clinicName = "Institute name is required";
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.state) errors.state = "State is required";
    if (!form.city.trim()) errors.city = "City is required";
    if (!form.contact.trim()) errors.contact = "Mobile number is required";
    else if (!/^[+]?\d{10,13}$/.test(form.contact.replace(/[\s-]/g, "")))
      errors.contact = "Enter a valid 10-digit number";
    return errors;
  };

  /* ── Submit: Step 1 → update, Step 2 → convert ── */
  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      /* ── Step 1: Save all form data to the lead ── */
      setStep(1);
      await leadsApi.update(lead._id, form);

      /* ── Step 2: Change stage to "client" ── */
      setStep(2);
      await pushToClient(lead._id, form); // context also patches local state

      setStep("done");
      setToast({
        type: "success",
        msg: `✓ ${form.clinicName || form.doctorName} converted to client!`,
      });
      // updated client data wapas do — page turant invoice option dikha sake
      setTimeout(() => onSuccess({ ...lead, ...form, stage: "client" }), 1300);
    } catch (err) {
      console.error("Conversion error:", err);
      setToast({ type: "error", msg: err.message || "Conversion failed. Try again." });
      setStep(null);
      setLoading(false);
    }
  };

  /* ── Shared focus / blur handlers ── */
  const focusHandlers = (field) => ({
    onFocus: (event) => {
      event.target.style.borderColor = "rgba(16,185,129,.55)";
    },
    onBlur: (event) => {
      event.target.style.borderColor = errors[field] ? "#f87171" : "var(--border-dim)";
    },
  });

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div
      onClick={!loading ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1000,
            background: toast.type === "success" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
            border: `1px solid ${
              toast.type === "success" ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.4)"
            }`,
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: "none",
            color: toast.type === "success" ? "#4ade80" : "#f87171",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "90vh",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "15px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(16,185,129,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={16} color="var(--green)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-white)" }}>
                Convert to Client
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Confirm &amp; complete client details
              </div>
            </div>
          </div>
          <button
            onClick={!loading ? onClose : undefined}
            style={{
              background: "none",
              border: "none",
              cursor: loading ? "default" : "pointer",
              color: "var(--text-dim)",
              padding: 6,
              borderRadius: 8,
              opacity: loading ? 0.3 : 1,
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            padding: 20,
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Person Name */}
          <Field label="Person Name" error={errors.doctorName}>
            <input
              value={form.doctorName}
              onChange={(event) => set("doctorName", event.target.value)}
              placeholder="Dr. / Contact person name"
              style={inputBase(errors.doctorName)}
              disabled={loading}
              {...focusHandlers("doctorName")}
            />
          </Field>

          {/* Institute Name */}
          <Field label="Institute Name" error={errors.clinicName}>
            <input
              value={form.clinicName}
              onChange={(event) => set("clinicName", event.target.value)}
              placeholder="Institute name"
              style={inputBase(errors.clinicName)}
              disabled={loading}
              {...focusHandlers("clinicName")}
            />
          </Field>

          {/* Address */}
          <Field label="Address" error={errors.address}>
            <textarea
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
              placeholder="Building, Street, Area, PIN…"
              rows={2}
              style={{ ...inputBase(errors.address), resize: "none" }}
              disabled={loading}
              {...focusHandlers("address")}
            />
          </Field>

          {/* State + City */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="State" error={errors.state}>
              <select
                value={form.state}
                onChange={(event) => set("state", event.target.value)}
                disabled={loading}
                style={{ ...inputBase(errors.state), cursor: loading ? "default" : "pointer" }}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((indianState) => (
                  <option key={indianState} value={indianState}>
                    {indianState}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="City" error={errors.city}>
              <input
                value={form.city}
                onChange={(event) => set("city", event.target.value)}
                placeholder="City"
                style={inputBase(errors.city)}
                disabled={loading}
                {...focusHandlers("city")}
              />
            </Field>
          </div>

          {/* Mobile */}
          <Field label="Mobile Number" error={errors.contact}>
            <input
              value={form.contact}
              onChange={(event) => set("contact", event.target.value)}
              placeholder="+91 XXXXX XXXXX"
              style={inputBase(errors.contact)}
              disabled={loading}
              {...focusHandlers("contact")}
            />
          </Field>

          {/* ── Progress steps (only shown while submitting) ── */}
          {step !== null && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-dim)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Step
                done={step === 2 || step === "done"}
                active={step === 1}
                label="Step 1 — Saving lead details"
              />
              <Step
                done={step === "done"}
                active={step === 2}
                label="Step 2 — Converting to client"
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card)",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "none",
              border: "1px solid var(--border-dim)",
              borderRadius: 8,
              padding: "9px 20px",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.4 : 1,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: "#10b981",
              border: "none",
              borderRadius: 8,
              padding: "9px 22px",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
              display: "flex",
              alignItems: "center",
              gap: 7,
              minWidth: 160,
              justifyContent: "center",
            }}
          >
            {step === 1 && (
              <>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving
                details…
              </>
            )}
            {step === 2 && (
              <>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Converting…
              </>
            )}
            {step === "done" && (
              <>
                <CheckCircle2 size={13} /> Done!
              </>
            )}
            {step === null && (
              <>
                <UserCheck size={13} /> Convert to Client
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
