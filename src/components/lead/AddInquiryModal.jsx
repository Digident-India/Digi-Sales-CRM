/**
 * Modal to log a new inquiry (person, institute, contact, city, state, enquiry).
 *
 * Used by: routes/AppRoutes.jsx
 */

import { useState } from "react";
import { useCrm } from "../../context/CrmContext";

export default function AddInquiryModal({ onClose }) {
  const { addInquiry } = useCrm();

  const [form, setForm] = useState({
    doctorName: "",
    clinicName: "",
    email: "",
    contact: "",
    city: "",
    state: "",
    enquiry: "",
    remarks: "",
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (key) => (event) =>
    setForm((prevForm) => ({ ...prevForm, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErr("");

    try {
      // Submits raw state directly without running any validation criteria
      await addInquiry(form);
      onClose();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--orange-dim)",
                border: "1px solid var(--orange-ring)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "var(--orange)", fontSize: 17, lineHeight: 1 }}>+</span>
            </div>
            <p className="modal-title">New Inquiry Record</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-group">
          <div>
            <label className="label">Person Name</label>
            <input
              value={form.doctorName}
              onChange={set("doctorName")}
              placeholder="Person Full Name"
              className="input"
            />
          </div>

          <div>
            <label className="label">Institute Name</label>
            <input
              value={form.clinicName}
              onChange={set("clinicName")}
              placeholder="Institute name"
              className="input"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="doctor@example.com"
              className="input"
            />
          </div>

          <div className="form-row-2">
            <div>
              <label className="label">Contact</label>
              <input
                value={form.contact}
                onChange={set("contact")}
                placeholder="+91 XXXXX XXXXX"
                className="input mono"
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                value={form.city}
                onChange={set("city")}
                placeholder="City"
                className="input"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="label">State</label>
              <input
                value={form.state}
                onChange={set("state")}
                placeholder="State"
                className="input"
              />
            </div>
            <div>
              <label className="label">Enquiry</label>
              <input
                value={form.enquiry}
                onChange={set("enquiry")}
                placeholder="Product interest / request note"
                className="input"
              />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input
                value={form.remarks}
                onChange={set("remarks")}
                placeholder="Additional notes"
                className="input"
              />
            </div>
          </div>

          {err && <ErrorBox msg={err} />}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Saving…" : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
