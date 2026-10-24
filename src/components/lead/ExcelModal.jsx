/**
 * Modal to import inquiries from an Excel / CSV file (columns detected automatically).
 *
 * Used by: pages/InquiriesPage.jsx
 */

import { useState, useRef } from "react";
import { useCrm } from "../../context/CrmContext";

export default function ExcelModal({ onClose }) {
  const { handleImportExcel } = useCrm();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setErr("Only .xlsx, .xls, .csv files accepted");
      return;
    }
    setFile(file);
    setErr("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDrag(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const res = await handleImportExcel(file);
      setResult(res);
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
          <div>
            <p className="modal-title">Import Excel / CSV</p>
            <p className="modal-subtitle">.xlsx · .xls · .csv — columns auto-detected</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="form-group">
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${drag ? "var(--orange)" : "var(--border-mid)"}`,
                borderRadius: 12,
                padding: "28px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color .2s",
                background: drag ? "var(--orange-dim)" : "transparent",
              }}
            >
              {file ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
                  <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13 }}>
                    {file.name}
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
                    Click to browse or drag & drop
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 5 }}>
                    .xlsx · .xls · .csv (max 10 MB)
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(event) => handleFile(event.target.files[0])}
            />

            {/* Column hint */}
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                fontSize: 10,
                color: "var(--text-dim)",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Columns detected automatically:
              </strong>
              DOCTOR NAME · CLINIC NAME · CONTACT / CONTACT NO · EMAIL · CITY · STATE · ENQUIRY ·
              REMARKS
            </div>

            {err && <ErrorBox msg={err} />}

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={!file || busy} className="btn btn-primary">
                {busy ? "Importing…" : "Import Data"}
              </button>
            </div>
          </form>
        ) : (
          /* ── Results ── */
          <div className="form-group">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                {
                  l: "Inserted",
                  v: result.inserted,
                  c: "var(--green)",
                  dim: "var(--green-dim)",
                  ring: "var(--green-ring)",
                },
                {
                  l: "Skipped",
                  v: result.skipped,
                  c: "var(--yellow)",
                  dim: "var(--yellow-dim)",
                  ring: "var(--yellow-ring)",
                },
                {
                  l: "Errors",
                  v: result.errors?.length || 0,
                  c: "var(--red)",
                  dim: "var(--red-dim)",
                  ring: "var(--red-ring)",
                },
              ].map((step) => (
                <div
                  key={step.l}
                  style={{
                    background: step.dim,
                    border: `1px solid ${step.ring}`,
                    borderRadius: 10,
                    padding: "14px 10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 900, color: step.c }}>{step.v}</div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginTop: 3,
                    }}
                  >
                    {step.l}
                  </div>
                </div>
              ))}
            </div>

            {result.errors?.length > 0 && (
              <div
                style={{
                  background: "#1a0a0a",
                  border: "1px solid var(--red-ring)",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 10,
                  color: "var(--red)",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {result.errors.slice(0, 6).map((error, index) => (
                  <div key={index} style={{ marginBottom: 3 }}>
                    • {error.error}
                  </div>
                ))}
              </div>
            )}

            <button onClick={onClose} className="btn btn-primary" style={{ width: "100%" }}>
              Done — Close
            </button>
          </div>
        )}
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
