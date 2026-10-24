/**
 * Client search box at the top of the Create Invoice form (an invoice can only be made for a
 * client).
 *
 * Invoices can only be created for a client (the backend returns CLIENT_REQUIRED).
 * • Backend fuzzy search: name / clinic / phone / client ID — works even with
 *   spelling mistakes. Agents only see clients assigned to them.
 * • ↑ ↓ and Enter also work.
 *
 * Used by: pages/InvoiceFormPage.jsx
 * API: leadsApi.searchClients
 */

import { useEffect, useRef, useState } from "react";
import { Search, UserCheck, X as CloseIcon, Loader2 } from "lucide-react";
import { leadsApi } from "../../backend/ApiService.js";

const THEME = {
  bgBase: "var(--bg-base)",
  bgCard: "var(--bg-card)",
  borderDim: "var(--border-dim)",
  orange: "var(--orange)",
  orangeDim: "var(--orange-dim)",
  green: "#4ade80",
  textWhite: "var(--text-white)",
  textMuted: "var(--text-muted)",
  textDim: "var(--text-dim)",
  textGhost: "var(--text-ghost)",
};

export default function ClientPicker({ value, onChange, initialQuery = "", locked = false }) {
  const [searchText, setSearchText] = useState(initialQuery);
  const [open, setOpen] = useState(!value);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // debounce + fetch
  useEffect(() => {
    if (value || !open) return;
    let cancelled = false;
    const timerId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await leadsApi.searchClients(searchText.trim(), 15);
        const list = res?.data ?? res;
        if (!cancelled) {
          setItems(Array.isArray(list) ? list : []);
          setActive(0);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setError(error.message || "Could not load clients");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [searchText, open, value]);

  useEffect(() => {
    const close = (event) =>
      boxRef.current && !boxRef.current.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (client) => {
    onChange({ ...client, stage: "client" });
    setOpen(false);
  };

  const onKey = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((prevActive) => Math.min(prevActive + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prevActive) => Math.max(prevActive - 1, 0));
    } else if (event.key === "Enter" && open && items[active]) {
      event.preventDefault();
      pick(items[active]);
    } else if (event.key === "Escape") setOpen(false);
  };

  /* ── selected client card ── */
  if (value) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "rgba(74,222,128,.08)",
          border: "1px solid rgba(74,222,128,.35)",
          borderRadius: 10,
        }}
      >
        <UserCheck size={18} color={THEME.green} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: THEME.textWhite,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {value.doctorName || value.clinicName || "Client"}
            {value.clientId && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: THEME.green,
                  background: "rgba(74,222,128,.12)",
                  padding: "2px 7px",
                  borderRadius: 999,
                }}
              >
                {value.clientId}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>
            {[
              value.clinicName,
              value.contact,
              value.city,
              value.assignedAgent && `Agent: ${value.assignedAgent}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            style={{
              background: "none",
              border: `1px solid ${THEME.borderDim}`,
              borderRadius: 8,
              padding: "6px 11px",
              fontSize: 11,
              fontWeight: 700,
              color: THEME.textMuted,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Change
          </button>
        )}
      </div>
    );
  }

  /* ── search box ── */
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: THEME.textDim,
            pointerEvents: "none",
          }}
        />
        <input
          ref={inputRef}
          autoFocus
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search client — name, clinic, phone or client ID (spelling mistakes are OK)"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: THEME.bgBase,
            border: "1px solid rgba(230,135,54,.5)",
            borderRadius: 9,
            padding: "10px 34px 10px 34px",
            fontSize: 13,
            color: THEME.textWhite,
            outline: "none",
          }}
        />
        {loading ? (
          <Loader2
            size={14}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              marginTop: -7,
              color: THEME.textDim,
              animation: "spin 1s linear infinite",
            }}
          />
        ) : (
          searchText && (
            <button
              type="button"
              onClick={() => {
                setSearchText("");
                inputRef.current?.focus();
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: THEME.textDim,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <CloseIcon size={14} />
            </button>
          )
        )}
      </div>
      <div style={{ fontSize: 10.5, color: THEME.textDim, marginTop: 6 }}>
        Invoices can only be created for a client. Client not listed? Create it first from Client
        Book → “+ Create Client”.
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            top: 46,
            left: 0,
            right: 0,
            background: "var(--bg-surface)",
            border: `1px solid ${THEME.borderDim}`,
            borderRadius: 10,
            boxShadow: "0 14px 34px rgba(0,0,0,.35)",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {error && <div style={{ padding: 12, fontSize: 12, color: "#f87171" }}>{error}</div>}
          {!error && !loading && items.length === 0 && (
            <div style={{ padding: 14, fontSize: 12, color: THEME.textDim }}>
              No client found{searchText.trim() ? ` for “${searchText.trim()}”` : ""}. Try another
              spelling or the last 4 digits of the phone number.
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={item._id}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(index)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: `1px solid ${THEME.borderDim}`,
                background: index === active ? THEME.orangeDim : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.textWhite,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {item.doctorName || item.clinicName}
                {item.clientId && (
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: THEME.orange }}>
                    {item.clientId}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>
                {[
                  item.clinicName,
                  item.contact,
                  item.city,
                  item.assignedAgent && `Agent: ${item.assignedAgent}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
