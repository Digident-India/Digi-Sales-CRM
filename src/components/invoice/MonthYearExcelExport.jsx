/**
 * Button + dialog that exports the invoices of a chosen month and year to a two-sheet Excel report.
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { useState } from "react";
import { FileSpreadsheet, Loader2, X as CloseIcon, ChevronDown, CheckCircle2 } from "lucide-react";
import { showAlert, showError } from "../ui/Alert";
import { MONTH_NAMES, generateExcel } from "../../utils/InvoiceExcelReport";

// ─── Component ────────────────────────────────────────────────────────────────
const MonthYearExcelExport = ({ fetchInvoices }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, yearOffset) => now.getFullYear() - yearOffset);

  const handleExport = async () => {
    setLoading(true);
    setDone(false);
    try {
      const invoices = await fetchInvoices(month, year);
      if (!invoices?.length) {
        showAlert(
          "No invoices found",
          `No invoices found for ${MONTH_NAMES[month - 1]} ${year}.`,
          "info"
        );
        return;
      }
      await generateExcel(invoices, month, year);
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1200);
    } catch (err) {
      console.error("Export failed:", err);
      showError("Export failed — " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared inline-style select ── */
  const Select = ({ value, onChange, children }) => (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          appearance: "none",
          WebkitAppearance: "none",
          background: "var(--bg-card)",
          border: "1px solid var(--border-mid)",
          borderRadius: 10,
          padding: "10px 36px 10px 14px",
          color: "var(--text-white)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
          transition: "border-color .2s",
        }}
        onFocus={(event) => {
          event.target.style.borderColor = "rgba(234,88,12,.5)";
        }}
        onBlur={(event) => {
          event.target.style.borderColor = "var(--border-mid)";
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      />
    </div>
  );

  return (
    <>
      {/* ── Trigger button — matches CRM header button style ── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "rgba(234,88,12,.1)",
          border: "1px solid rgba(234,88,12,.3)",
          borderRadius: 10,
          padding: "10px 16px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 800,
          color: "#ea580c",
          transition: "all .2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "rgba(234,88,12,.18)";
          event.currentTarget.style.borderColor = "rgba(234,88,12,.5)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "rgba(234,88,12,.1)";
          event.currentTarget.style.borderColor = "rgba(234,88,12,.3)";
        }}
      >
        <FileSpreadsheet size={15} />
        Export Excel
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              setDone(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid rgba(234,88,12,.2)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 24px 60px rgba(0,0,0,.6)",
              overflow: "hidden",
              animation: "fadeSlide .22s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                background:
                  "linear-gradient(135deg,#1A1A2E 0%,#16213E 60%,rgba(234,88,12,.15) 100%)",
                borderBottom: "1px solid rgba(234,88,12,.15)",
                padding: "20px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "rgba(234,88,12,.15)",
                    border: "1px solid rgba(234,88,12,.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileSpreadsheet size={20} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-white)" }}>
                    Export Invoice Report
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    Professional Excel · 2 Sheets · Color-coded
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setDone(false);
                }}
                style={{
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 7px",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  transition: "all .2s",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = "var(--text-white)";
                  event.currentTarget.style.background = "rgba(255,255,255,.1)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = "var(--text-muted)";
                  event.currentTarget.style.background = "rgba(255,255,255,.06)";
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px" }}>
              {/* Month + Year selects */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginBottom: 7,
                    }}
                  >
                    Month
                  </div>
                  <Select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                    {MONTH_NAMES.map((monthName, index) => (
                      <option key={monthName} value={index + 1}>
                        {monthName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginBottom: 7,
                    }}
                  >
                    Year
                  </div>
                  <Select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Preview card */}
              <div
                style={{
                  background: "rgba(234,88,12,.06)",
                  border: "1px solid rgba(234,88,12,.15)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-ghost)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginBottom: 4,
                    }}
                  >
                    Exporting Report For
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: "var(--text-white)",
                      fontFamily: "monospace",
                    }}
                  >
                    {MONTH_NAMES[month - 1]} {year}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-ghost)",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginBottom: 4,
                    }}
                  >
                    Format
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>
                    .xlsx · 2 Sheets
                  </div>
                </div>
              </div>

              {/* Sheet info cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Sheet 1",
                    title: "Invoice List",
                    desc: "15 columns · color-coded status · totals row",
                  },
                  {
                    label: "Sheet 2",
                    title: "Summary Dashboard",
                    desc: "12 KPIs · customer breakdown · grand total",
                  },
                ].map(({ label, title, desc }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 9,
                        fontWeight: 800,
                        color: "#ea580c",
                        background: "rgba(234,88,12,.1)",
                        border: "1px solid rgba(234,88,12,.2)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        marginBottom: 7,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-white)",
                        marginBottom: 3,
                      }}
                    >
                      {title}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-ghost)", lineHeight: 1.5 }}>
                      {desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <button
                onClick={handleExport}
                disabled={loading || done}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: done ? "rgba(34,197,94,.15)" : "rgba(234,88,12,.9)",
                  border: done ? "1px solid rgba(34,197,94,.3)" : "none",
                  borderRadius: 12,
                  padding: "13px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  color: done ? "#4ade80" : "#fff",
                  cursor: loading || done ? "not-allowed" : "pointer",
                  transition: "all .25s",
                  opacity: loading ? 0.75 : 1,
                  boxShadow: done ? "none" : "0 4px 20px rgba(234,88,12,.3)",
                }}
                onMouseEnter={(event) => {
                  if (!loading && !done) event.currentTarget.style.background = "rgba(234,88,12,1)";
                }}
                onMouseLeave={(event) => {
                  if (!loading && !done)
                    event.currentTarget.style.background = "rgba(234,88,12,.9)";
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />{" "}
                    Generating Report…
                  </>
                ) : done ? (
                  <>
                    <CheckCircle2 size={16} /> Downloaded!
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} /> Download Excel Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthYearExcelExport;
