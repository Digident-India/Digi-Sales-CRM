/**
 * Modal for managers/admins to create a client directly (skipping Inquiry and Follow-up), then
 * optionally start an invoice.
 *
 * Manager / Admin / Super Admin create a client directly, without going
 * through Inquiry ➔ Follow-up. Backend: POST /leads/create-client.
 * The record is a normal client-stage lead (clientOrigin "direct"), so it
 * appears in the Client Book and uses the same Create Invoice flow.
 *
 * Used by: pages/ClientsPage.jsx
 * API: leadsApi.getClientOwners
 */

import { useEffect, useState } from "react";
import { useCrm } from "../../context/CrmContext";
import { leadsApi } from "../../backend/ApiService.js";
import { INDIAN_STATES } from "../lead/ConvertToClientModal";

const DEFAULT_OPTION = "__default__"; // "Vithal Sir"
const OTHER_OPTION = "__other__"; // custom name

const EMPTY_FORM = {
  doctorName: "",
  clinicName: "",
  contact: "",
  email: "",
  address: "",
  state: "",
  city: "",
  enquiry: "",
  remarks: "",
};

export default function CreateClientModal({ onClose, onCreateInvoice }) {
  const { createClient } = useCrm();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState(null);

  /* Contact By */
  const [defaultContactBy, setDefaultContactBy] = useState("Vithal Sir");
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [contactChoice, setContactChoice] = useState(DEFAULT_OPTION);
  const [otherName, setOtherName] = useState("");

  useEffect(() => {
    let alive = true;
    leadsApi
      .getClientOwners()
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        if (data?.defaultContactBy) setDefaultContactBy(data.defaultContactBy);
        setOwners(Array.isArray(data?.employees) ? data.employees : []);
      })
      .catch((error) => alive && setErr(`Couldn't load employees: ${error.message}`))
      .finally(() => alive && setOwnersLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /* Lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((prevForm) => ({ ...prevForm, [key]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [key]: undefined }));
  };

  /* Same required fields as Convert to Client, so both paths give the
     invoice form the same data (address is required on the invoice). */
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
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      errors.email = "Enter a valid email";
    if (contactChoice === OTHER_OPTION && !otherName.trim())
      errors.contactBy = "Enter the contact person's name";
    return errors;
  };

  const buildPayload = () => {
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    );
    if (contactChoice === OTHER_OPTION) {
      payload.contactBy = otherName.trim();
    } else if (contactChoice !== DEFAULT_OPTION) {
      payload.contactByEmployeeId = contactChoice;
    }
    // DEFAULT_OPTION → send neither; backend uses "Vithal Sir"
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const client = await createClient(buildPayload());
      setCreated(client);
    } catch (error) {
      setErr(error.message || "Could not create client");
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (field) => errors[field] && <div style={errStyle}>{errors[field]}</div>;
  const inputCls = () => "input";
  const errBorder = (field) => (errors[field] ? { borderColor: "var(--red)" } : undefined);

  /* ── Success state: offer the existing invoice flow straight away ── */
  if (created) {
    return (
      <div className="modal-overlay">
        <div className="modal-box" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <p className="modal-title">Client Created</p>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="form-group">
            <div style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.6 }}>
              <strong>{created.clinicName || created.doctorName}</strong> is now a client
              {created.clientId && (
                <>
                  {" "}
                  ·{" "}
                  <span style={{ fontFamily: "monospace", color: "var(--green)" }}>
                    {created.clientId}
                  </span>
                </>
              )}
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Contact By: {created.contactBy}
              </span>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Done
              </button>
              {onCreateInvoice && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onCreateInvoice(created)}
                >
                  📄 Create Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--green-dim)",
                border: "1px solid var(--green-ring)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "var(--green)", fontSize: 17, lineHeight: 1 }}>+</span>
            </div>
            <p className="modal-title">Create Client</p>
          </div>
          <button className="close-btn" onClick={onClose} disabled={busy}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-group" noValidate>
          <div className="form-row-2">
            <div>
              <label className="label">Person Name *</label>
              <input
                value={form.doctorName}
                onChange={set("doctorName")}
                placeholder="Dr. / Contact person name"
                className={inputCls("doctorName")}
                style={errBorder("doctorName")}
                disabled={busy}
              />
              {fieldErr("doctorName")}
            </div>
            <div>
              <label className="label">Institute Name *</label>
              <input
                value={form.clinicName}
                onChange={set("clinicName")}
                placeholder="Institute name"
                className={inputCls("clinicName")}
                style={errBorder("clinicName")}
                disabled={busy}
              />
              {fieldErr("clinicName")}
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="label">Mobile Number *</label>
              <input
                value={form.contact}
                onChange={set("contact")}
                placeholder="+91 XXXXX XXXXX"
                className={`${inputCls("contact")} mono`}
                style={errBorder("contact")}
                disabled={busy}
              />
              {fieldErr("contact")}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="doctor@example.com"
                className={inputCls("email")}
                style={errBorder("email")}
                disabled={busy}
              />
              {fieldErr("email")}
            </div>
          </div>

          <div>
            <label className="label">Address *</label>
            <textarea
              value={form.address}
              onChange={set("address")}
              rows={2}
              placeholder="Building, Street, Area, PIN…"
              className={inputCls("address")}
              style={{ resize: "none", ...errBorder("address") }}
              disabled={busy}
            />
            {fieldErr("address")}
          </div>

          <div className="form-row-2">
            <div>
              <label className="label">State *</label>
              <select
                value={form.state}
                onChange={set("state")}
                className={inputCls("state")}
                style={errBorder("state")}
                disabled={busy}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((indianState) => (
                  <option key={indianState} value={indianState}>
                    {indianState}
                  </option>
                ))}
              </select>
              {fieldErr("state")}
            </div>
            <div>
              <label className="label">City *</label>
              <input
                value={form.city}
                onChange={set("city")}
                placeholder="City"
                className={inputCls("city")}
                style={errBorder("city")}
                disabled={busy}
              />
              {fieldErr("city")}
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="label">Enquiry</label>
              <input
                value={form.enquiry}
                onChange={set("enquiry")}
                placeholder="Product interest"
                className="input"
                disabled={busy}
              />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input
                value={form.remarks}
                onChange={set("remarks")}
                placeholder="Additional notes"
                className="input"
                disabled={busy}
              />
            </div>
          </div>

          {/* ── Contact By: Vithal Sir (default) / employee / Other ── */}
          <div>
            <label className="label">Contact By</label>
            <select
              value={contactChoice}
              onChange={(event) => {
                setContactChoice(event.target.value);
                setErrors((prevErrors) => ({ ...prevErrors, contactBy: undefined }));
              }}
              className="input"
              disabled={busy}
            >
              <option value={DEFAULT_OPTION}>{defaultContactBy} (default)</option>
              {ownersLoading && <option disabled>Loading employees…</option>}
              {owners.map((owner) => (
                <option key={owner._id} value={owner._id}>
                  {owner.name || owner.email}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other…</option>
            </select>
            {contactChoice === OTHER_OPTION && (
              <input
                value={otherName}
                onChange={(event) => {
                  setOtherName(event.target.value);
                  setErrors((prevErrors) => ({ ...prevErrors, contactBy: undefined }));
                }}
                placeholder="Enter name"
                className={inputCls("contactBy")}
                style={{ marginTop: 8, ...errBorder("contactBy") }}
                disabled={busy}
                autoFocus
              />
            )}
            {fieldErr("contactBy")}
          </div>

          {err && <ErrorBox msg={err} />}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn btn-green">
              {busy ? "Creating…" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const errStyle = { fontSize: 10, color: "var(--red)", marginTop: 4 };

function ErrorBox({ msg }) {
  return (
    <div
      style={{
        background: "var(--red-dim)",
        border: "1px solid var(--red-ring)",
        borderRadius: 10,
        padding: "9px 13px",
        color: "var(--red)",
        fontSize: 12,
      }}
    >
      {msg}
    </div>
  );
}
